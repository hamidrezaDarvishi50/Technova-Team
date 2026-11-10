from django.shortcuts import render

# Create your views here.
from accounts.authentication import UserJWTAuthentication
from accounts.permission import IsAdminRole, HasSectionPermission
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from .models import Ticket
from .serializers import *

TAG = ["Contact Us"]

ADMIN_AUTH = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (فقط ادمین)"),
}


class TicketPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class TicketListCreateView(APIView):

    permission_section = "tickets"
    throttle_scope = "contact"

    def _method(self):
        request = getattr(self, "request", None)
        return request.method if request is not None else None

    def get_authenticators(self):
        # فرم عمومی است؛ توکن (حتی منقضی یا مشتری) نباید مانع ثبت پیام شود
        if self._method() == "POST":
            return []
        return [UserJWTAuthentication()]

    def get_permissions(self):
        if self._method() == "POST":
            return [AllowAny()]
        return [HasSectionPermission()]

    def get_throttles(self):
        # محدودیت تعداد فقط روی ثبت پیام؛ ادمین محدود نمی‌شود
        if self._method() == "POST":
            return [ScopedRateThrottle()]
        return []

    @extend_schema(
        tags=TAG,
        summary="ثبت پیام تماس با ما (عمومی)",
        description="بدون نیاز به لاگین. برای جلوگیری از اسپم، تعداد درخواست هر IP محدود است.",
        request=TicketCreateSerializer,
        responses={
            201: OpenApiResponse(description="پیام ثبت شد"),
            400: OpenApiResponse(description="داده نامعتبر"),
            429: OpenApiResponse(description="تعداد درخواست بیش از حد مجاز"),
        },
    )
    def post(self, request):
        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "پیام شما با موفقیت ثبت شد."}, status=status.HTTP_201_CREATED
        )

    @extend_schema(
        tags=TAG,
        summary="لیست پیام‌ها (فقط ادمین)",
        description="جدیدترین‌ها اول.",
        parameters=[
            OpenApiParameter("page", int, description="شماره‌ی صفحه"),
            OpenApiParameter("page_size", int, description="تعداد در صفحه (حداکثر ۱۰۰)"),
        ],
        responses={200: PaginatedTicketSerializer, **ADMIN_AUTH},
    )
    def get(self, request):
        paginator = TicketPagination()
        page = paginator.paginate_queryset(Ticket.objects.all(), request, view=self)
        return paginator.get_paginated_response(TicketSerializer(page, many=True).data)


class TicketDetailView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "tickets"

    @extend_schema(
        tags=TAG,
        summary="جزئیات پیام (فقط ادمین)",
        responses={
            200: TicketSerializer,
            404: OpenApiResponse(description="پیام پیدا نشد"),
            **ADMIN_AUTH,
        },
    )
    def get(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        return Response(TicketSerializer(ticket).data)