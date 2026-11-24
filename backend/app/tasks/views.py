from django.shortcuts import render

# Create your views here.
# tasks/views.py
#
# قوانین دسترسی:
#  - ساخت وظیفه: tasks.create
#  - لیست با scope=assigned|created: هر کارمندی (فقط وظایف خودش)
#  - لیست با scope=all: tasks.view
#  - جزئیات/ویرایش/حذف: سازنده یا مسئولِ آن وظیفه همیشه مجاز است؛
#    بقیه باید tasks.view / tasks.edit / tasks.delete داشته باشند.
#  - نوع‌ها: لیست برای هر کارمند، ساخت tasks.create، حذف tasks.delete

from accounts.authentication import UserJWTAuthentication
from accounts.permission import HasSectionPermission, IsStaffUser
from django.db.models import Case, Count, F, IntegerField, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Task, TaskType
from .pagination import TaskPagination
from .serializers import (
    PaginatedTaskSerializer,
    TaskDetailSerializer,
    TaskFilterSerializer,
    TaskListSerializer,
    TaskTypeSerializer,
    TaskWriteSerializer,
)

TASK_TAG = ["Tasks"]
AUTH_ERRORS = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید"),
}
PAGE_PARAMS = [
    OpenApiParameter("page", int, description="شماره‌ی صفحه (از ۱)"),
    OpenApiParameter("page_size", int, description="تعداد در صفحه (پیش‌فرض ۲۰، حداکثر ۱۰۰)"),
]
OPEN_STATUSES = [Task.Status.TODO, Task.Status.IN_PROGRESS]
IMPORTANCE_RANK = Case(
    When(importance=Task.Importance.EMERGENCY, then=Value(0)),
    When(importance=Task.Importance.IMPORTANT, then=Value(1)),
    When(importance=Task.Importance.MEDIUM, then=Value(2)),
    default=Value(3),
    output_field=IntegerField(),
)
SORT_ORDERING = {
    "newest": lambda: ("-created_at", "-id"),
    "oldest": lambda: ("created_at", "id"),
    "deadline": lambda: (F("deadline").asc(nulls_last=True), "-id"),
    "importance": lambda: ("importance_rank", F("deadline").asc(nulls_last=True), "-id"),
}


def tasks_queryset():
    return Task.objects.select_related("type", "created_by").prefetch_related("assigned_to")


def is_participant(user, task) -> bool:
    """سازنده یا یکی از مسئول‌ها (از prefetch استفاده می‌کند)."""
    return task.created_by_id == user.id or any(u.id == user.id for u in task.assigned_to.all())


def can(user, task, action) -> bool:
    return is_participant(user, task) or user.has_permission("tasks", action)


def load_task(request, pk, action):
    """
    وظیفه را می‌آورد و دسترسی را چک می‌کند.
    کسی که حتی اجازه‌ی دیدن ندارد 404 می‌گیرد (وجود وظیفه فاش نشود)؛
    کسی که می‌بیند ولی اجازه‌ی action ندارد 403.
    """
    task = get_object_or_404(tasks_queryset(), pk=pk)
    if not can(request.user, task, "view"):
        raise NotFound()
    if action != "view" and not can(request.user, task, action):
        raise PermissionDenied("برای این کار دسترسی ندارید.")
    return task


def detail_response(request, pk, code=status.HTTP_200_OK):
    task = get_object_or_404(tasks_queryset(), pk=pk)
    return Response(TaskDetailSerializer(task, context={"request": request}).data, status=code)


class TaskBaseView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [IsStaffUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]


# --------------------------------------------------------------------------
# وظایف
# --------------------------------------------------------------------------
class TaskListCreateView(TaskBaseView):
    @extend_schema(
        tags=TASK_TAG,
        summary="لیست وظایف",
        description=(
            "scope=assigned (پیش‌فرض): وظایفی که برای من تعریف شده | "
            "scope=created: وظایفی که من تعریف کرده‌ام | "
            "scope=all: همه‌ی وظایف (نیازمند tasks.view)."
        ),
        parameters=[TaskFilterSerializer, *PAGE_PARAMS],
        responses={
            200: PaginatedTaskSerializer,
            400: OpenApiResponse(description="پارامتر نامعتبر"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request):
        filters = TaskFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data
        user = request.user

        queryset = tasks_queryset()
        scope = params["scope"]
        if scope == "assigned":
            queryset = queryset.filter(assigned_to=user)
        elif scope == "created":
            queryset = queryset.filter(created_by=user)
        elif not user.has_permission("tasks", "view"):
            raise PermissionDenied("برای دیدن همه‌ی وظایف دسترسی tasks.view لازم است.")

        if "status" in params:
            queryset = queryset.filter(status=params["status"])
        if "importance" in params:
            queryset = queryset.filter(importance=params["importance"])
        if params.get("type"):
            queryset = queryset.filter(type__name__iexact=params["type"].strip())
        if params.get("search", "").strip():
            queryset = queryset.filter(subject__icontains=params["search"].strip())
        if params.get("overdue") is not None:
            overdue = Q(deadline__lt=timezone.now(), status__in=OPEN_STATUSES)
            queryset = queryset.filter(overdue) if params["overdue"] else queryset.exclude(overdue)

        if params["sort"] == "importance":
            queryset = queryset.annotate(importance_rank=IMPORTANCE_RANK)
        queryset = queryset.order_by(*SORT_ORDERING[params["sort"]]())

        paginator = TaskPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(TaskListSerializer(page, many=True).data)

    @extend_schema(
        tags=TASK_TAG,
        summary="ساخت وظیفه (نیازمند tasks.create)",
        description=(
            "type نام نوع است؛ اگر وجود نداشته باشد خودکار ساخته می‌شود. "
            "برای فایل از multipart/form-data استفاده کن (assigned_to را چند بار بفرست). "
            "وظیفه‌ی تکرارشونده: is_periodic=true، repeat_every و start_at الزامی است."
        ),
        request=TaskWriteSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **AUTH_ERRORS,
        },
    )
    def post(self, request):
        if not request.user.has_permission("tasks", "create"):
            raise PermissionDenied("برای ساخت وظیفه دسترسی tasks.create لازم است.")
        serializer = TaskWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        return detail_response(request, task.pk, status.HTTP_201_CREATED)


class TaskDetailView(TaskBaseView):
    @extend_schema(
        tags=TASK_TAG,
        summary="جزئیات وظیفه (سازنده، مسئول یا tasks.view)",
        responses={
            200: TaskDetailSerializer,
            404: OpenApiResponse(description="وظیفه پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request, pk):
        task = load_task(request, pk, "view")
        return Response(TaskDetailSerializer(task, context={"request": request}).data)

    @extend_schema(
        tags=TASK_TAG,
        summary="ویرایش وظیفه (سازنده، مسئول یا tasks.edit)",
        request=TaskWriteSerializer,
        responses={
            200: TaskDetailSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="وظیفه پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def patch(self, request, pk):
        task = load_task(request, pk, "edit")
        serializer = TaskWriteSerializer(
            task, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return detail_response(request, pk)

    @extend_schema(
        tags=TASK_TAG,
        summary="حذف وظیفه (سازنده، مسئول یا tasks.delete)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="وظیفه پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def delete(self, request, pk):
        task = load_task(request, pk, "delete")
        file = task.file
        task.delete()  # نمونه‌های ساخته‌شده از آن می‌مانند (source خالی می‌شود)
        if file:
            file.delete(save=False)
        return Response(status=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------
# نوع وظیفه
# --------------------------------------------------------------------------
class TaskTypeListCreateView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_section = "tasks"

    def get_permissions(self):
        request = getattr(self, "request", None)
        if request is not None and request.method == "GET":
            return [IsStaffUser()]  # برای ساخت وظیفه، همه باید لیست نوع‌ها را ببینند
        return [HasSectionPermission()]

    @extend_schema(
        tags=TASK_TAG,
        summary="لیست نوع‌های وظیفه (هر کارمند)",
        responses={200: TaskTypeSerializer(many=True), **AUTH_ERRORS},
    )
    def get(self, request):
        types = TaskType.objects.annotate(tasks_count=Count("tasks"))
        return Response(TaskTypeSerializer(types, many=True).data)

    @extend_schema(
        tags=TASK_TAG,
        summary="افزودن نوع وظیفه (نیازمند tasks.create)",
        request=TaskTypeSerializer,
        responses={
            201: TaskTypeSerializer,
            400: OpenApiResponse(description="نام نامعتبر یا تکراری"),
            **AUTH_ERRORS,
        },
    )
    def post(self, request):
        serializer = TaskTypeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task_type = serializer.save()
        return Response(
            TaskTypeSerializer(TaskType.objects.annotate(tasks_count=Count("tasks")).get(pk=task_type.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class TaskTypeDetailView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "tasks"

    @extend_schema(
        tags=TASK_TAG,
        summary="حذف نوع وظیفه (نیازمند tasks.delete)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="نوع پیدا نشد"),
            409: OpenApiResponse(description="وظایفی از این نوع استفاده می‌کنند"),
            **AUTH_ERRORS,
        },
    )
    def delete(self, request, pk):
        task_type = get_object_or_404(TaskType, pk=pk)
        if task_type.tasks.exists():
            return Response(
                {"detail": "وظایفی از این نوع استفاده می‌کنند و حذف نمی‌شود."},
                status=status.HTTP_409_CONFLICT,
            )
        task_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
