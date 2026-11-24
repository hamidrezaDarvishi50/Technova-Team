from django.shortcuts import render

# Create your views here.
# دسترسی: بخش "leads" در user_access  (GET=view, POST=create, PATCH=edit, DELETE=delete)
# هر کارمندِ دارای دسترسی به همه‌ی لیدها دسترسی دارد (لید کارمند مسئول ندارد).

from accounts.authentication import UserJWTAuthentication
from accounts.permission import HasSectionPermission
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Lead
from .pagination import LeadPagination
from .serializers import (
    LeadDetailSerializer,
    LeadFilterSerializer,
    LeadListSerializer,
    LeadNoteCreateSerializer,
    LeadNoteSerializer,
    LeadWriteSerializer,
    PaginatedLeadSerializer,
)

LEAD_TAG = ["Leads"]
AUTH_ERRORS = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (leads)"),
}
PAGE_PARAMS = [
    OpenApiParameter("page", int, description="شماره‌ی صفحه (از ۱)"),
    OpenApiParameter("page_size", int, description="تعداد در صفحه (پیش‌فرض ۲۰، حداکثر ۱۰۰)"),
]


def leads_queryset():
    return Lead.objects.annotate(notes_count=Count("notes"))


class LeadBaseView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "leads"


class LeadListCreateView(LeadBaseView):
    @extend_schema(
        tags=LEAD_TAG,
        summary="لیست لیدها (نیازمند leads.view)",
        description="جدیدترین‌ها اول. فیلتر با state، type و جستجو در نام، شماره و ایمیل.",
        parameters=[LeadFilterSerializer, *PAGE_PARAMS],
        responses={
            200: PaginatedLeadSerializer,
            400: OpenApiResponse(description="پارامتر نامعتبر"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request):
        filters = LeadFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        queryset = leads_queryset()
        if "state" in params:
            queryset = queryset.filter(state=params["state"])
        if "type" in params:
            queryset = queryset.filter(type=params["type"])
        search = (params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(phone__icontains=search.lstrip("0"))
                | Q(email__icontains=search)
            )
        queryset = queryset.order_by(
            *(("created_at", "id") if params["sort"] == "oldest" else ("-created_at", "-id"))
        )

        paginator = LeadPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(LeadListSerializer(page, many=True).data)

    @extend_schema(
        tags=LEAD_TAG,
        summary="ثبت لید جدید (نیازمند leads.create)",
        description="type: contact_form | phone_call | other. state پیش‌فرض in_progress است.",
        request=LeadWriteSerializer,
        responses={
            201: LeadDetailSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **AUTH_ERRORS,
        },
    )
    def post(self, request):
        serializer = LeadWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        lead = serializer.save()
        data = LeadDetailSerializer(leads_queryset().get(pk=lead.pk)).data
        return Response(data, status=status.HTTP_201_CREATED)


class LeadDetailView(LeadBaseView):
    @extend_schema(
        tags=LEAD_TAG,
        summary="جزئیات لید به‌همراه تاریخچه‌ی پیگیری (نیازمند leads.view)",
        responses={
            200: LeadDetailSerializer,
            404: OpenApiResponse(description="لید پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request, pk):
        lead = get_object_or_404(leads_queryset().prefetch_related("notes__author"), pk=pk)
        return Response(LeadDetailSerializer(lead).data)

    @extend_schema(
        tags=LEAD_TAG,
        summary="ویرایش لید (نیازمند leads.edit)",
        description="تغییر state خودکار در تاریخچه‌ی پیگیری ثبت می‌شود.",
        request=LeadWriteSerializer,
        responses={
            200: LeadDetailSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="لید پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def patch(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        serializer = LeadWriteSerializer(
            lead, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        lead = get_object_or_404(leads_queryset().prefetch_related("notes__author"), pk=pk)
        return Response(LeadDetailSerializer(lead).data)

    @extend_schema(
        tags=LEAD_TAG,
        summary="حذف لید به‌همراه تاریخچه‌اش (نیازمند leads.delete)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="لید پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def delete(self, request, pk):
        get_object_or_404(Lead, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeadNoteListCreateView(LeadBaseView):
    # ثبت یادداشت یعنی ویرایش پرونده‌ی لید؛ پس به leads.edit نیاز دارد، نه leads.create
    permission_actions = {"POST": "edit"}

    @extend_schema(
        tags=LEAD_TAG,
        summary="تاریخچه‌ی پیگیری لید (نیازمند leads.view)",
        description="جدیدترین‌ها اول.",
        responses={
            200: LeadNoteSerializer(many=True),
            404: OpenApiResponse(description="لید پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        notes = lead.notes.select_related("author")
        return Response(LeadNoteSerializer(notes, many=True).data)

    @extend_schema(
        tags=LEAD_TAG,
        summary="ثبت یادداشت پیگیری (نیازمند leads.edit)",
        description=(
            "یادداشت فقط اضافه می‌شود و بعداً قابل ویرایش یا حذف نیست. "
            "اگر state فرستاده شود و با وضعیت فعلی فرق کند، وضعیت لید هم همزمان عوض می‌شود."
        ),
        request=LeadNoteCreateSerializer,
        responses={
            201: LeadNoteSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="لید پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        serializer = LeadNoteCreateSerializer(
            data=request.data, context={"request": request, "lead": lead}
        )
        serializer.is_valid(raise_exception=True)
        note = serializer.save()
        return Response(LeadNoteSerializer(note).data, status=status.HTTP_201_CREATED)
