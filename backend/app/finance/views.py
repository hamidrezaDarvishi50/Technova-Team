from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status

from .serializers import DiscountCodeSerializer
from .models import DiscountCode

from drf_spectacular.utils import extend_schema, OpenApiResponse

from accounts.authentication import UserJWTAuthentication
from accounts.permission import IsAdminRole, HasSectionPermission
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404


TAG = ["Discount Code"]

AUTH_RESPONSES = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (فقط ادمین)"),
}


class DiscountCodeBaseView(APIView):
    """
    مدیریت کدهای تخفیف: فقط کارمند با role=admin.
    توکن مشتری (Customer) یا کاربر بدون توکن همیشه رد می‌شود.
    """

    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "discounts"


class DiscountCodeListView(DiscountCodeBaseView):
    @extend_schema(
        tags=TAG,
        summary="لیست کدهای تخفیف (فقط ادمین)",
        responses={200: DiscountCodeSerializer(many=True), **AUTH_RESPONSES},
    )
    def get(self, request: Request):
        codes = DiscountCode.objects.order_by("-created_at")
        return Response(DiscountCodeSerializer(codes, many=True).data)

    @extend_schema(
        tags=TAG,
        summary="ساخت کد تخفیف (فقط ادمین)",
        request=DiscountCodeSerializer,
        responses={
            201: DiscountCodeSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **AUTH_RESPONSES,
        },
    )
    def post(self, request: Request):
        serializer = DiscountCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DiscountCodeDetailView(DiscountCodeBaseView):
    @extend_schema(
        tags=TAG,
        summary="جزئیات کد تخفیف (فقط ادمین)",
        responses={
            200: DiscountCodeSerializer,
            404: OpenApiResponse(description="کد تخفیف پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def get(self, request:Request, pk):
        code = get_object_or_404(DiscountCode, pk=pk)
        return Response(DiscountCodeSerializer(code).data)

    @extend_schema(
        tags=TAG,
        summary="ویرایش کد تخفیف (فقط ادمین)",
        request=DiscountCodeSerializer,
        responses={
            200: DiscountCodeSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="کد تخفیف پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def patch(self, request:Request, pk):
        code = get_object_or_404(DiscountCode, pk=pk)
        serializer = DiscountCodeSerializer(code, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        tags=TAG,
        summary="حذف کد تخفیف (فقط ادمین)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="کد تخفیف پیدا نشد"),
            409: OpenApiResponse(description="این کد در سفارش‌ها استفاده شده و حذف نمی‌شود"),
            **AUTH_RESPONSES,
        },
    )
    def delete(self, request:Request, pk):
        code = get_object_or_404(DiscountCode, pk=pk)
        try:
            code.delete()
        except ProtectedError:
            return Response(
                {"detail": "این کد در سفارش‌ها استفاده شده و قابل حذف نیست."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)