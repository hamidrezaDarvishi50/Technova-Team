from django.shortcuts import render

# Create your views here.

from accounts.authentication import CustomerJWTAuthentication, UserJWTAuthentication
from accounts.permission import IsAdminRole, IsCustomer
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.views import APIView

from .models import Comment
from products.models import Product
from .serializers import *

COMMENT_TAG = ["Comment"]
ADMIN_COMMENT_TAG = ["Comment (Admin)"]

AUTH_RESPONSES = {401: OpenApiResponse(description="احراز هویت نشده")}
ADMIN_RESPONSES = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (فقط ادمین)"),
}


# --------------------------------------------------------------------------
# مشتری / عمومی
# --------------------------------------------------------------------------
class ProductCommentListCreateView(APIView):
    """GET: عمومی (بدون لاگین) | POST: فقط مشتری لاگین‌شده."""

    def _is_safe_request(self):
        request = getattr(self, "request", None)
        return request is not None and request.method in SAFE_METHODS

    def get_authenticators(self):
        if self._is_safe_request():
            return []
        return [CustomerJWTAuthentication()]

    def get_permissions(self):
        if self._is_safe_request():
            return [AllowAny()]
        return [IsCustomer()]

    @extend_schema(
        tags=COMMENT_TAG,
        summary="نظرات تأییدشده‌ی یک محصول",
        description="برای همه قابل مشاهده است (بدون نیاز به لاگین).",
        responses={
            200: CommentPublicSerializer(many=True),
            404: OpenApiResponse(description="محصول پیدا نشد"),
        },
    )
    def get(self, request:Request, slug):
        product = get_object_or_404(Product, slug=slug)
        comments = product.comments.filter(is_confirmed=True).select_related("customer")
        return Response(CommentPublicSerializer(comments, many=True).data)

    @extend_schema(
        tags=COMMENT_TAG,
        summary="ثبت نظر و امتیاز (فقط مشتری)",
        description="نظر بعد از تأیید ادمین نمایش داده می‌شود. هر مشتری برای هر محصول یک نظر دارد.",
        request=CommentCreateSerializer,
        responses={
            201: CommentMineSerializer,
            400: OpenApiResponse(description="داده نامعتبر یا نظر تکراری"),
            404: OpenApiResponse(description="محصول پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def post(self, request:Request, slug):
        product = get_object_or_404(Product, slug=slug)
        serializer = CommentCreateSerializer(
            data=request.data, context={"request": request, "product": product}
        )
        serializer.is_valid(raise_exception=True)
        try:
            comment = serializer.save(customer=request.user, product=product)
        except IntegrityError:  # دو درخواست هم‌زمان
            return Response(
                {"detail": "شما قبلاً برای این محصول نظر ثبت کرده‌اید."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            CommentMineSerializer(comment).data, status=status.HTTP_201_CREATED
        )


class CustomerCommentBase(APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes = [IsCustomer]


class MyCommentListView(CustomerCommentBase):
    @extend_schema(
        tags=COMMENT_TAG,
        summary="نظرات من (با وضعیت تأیید)",
        responses={200: CommentMineSerializer(many=True), **AUTH_RESPONSES},
    )
    def get(self, request:Request):
        comments = Comment.objects.filter(customer=request.user).select_related("product")
        return Response(CommentMineSerializer(comments, many=True).data)


class MyCommentDetailView(CustomerCommentBase):
    def get_comment(self, request:Request, pk):
        return get_object_or_404(Comment, pk=pk, customer=request.user)

    @extend_schema(
        tags=COMMENT_TAG,
        summary="ویرایش نظر من",
        description="بعد از ویرایش، نظر دوباره باید توسط ادمین تأیید شود.",
        request=CommentUpdateSerializer,
        responses={
            200: CommentMineSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="نظر پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def patch(self, request:Request, pk):
        comment = self.get_comment(request, pk)
        serializer = CommentUpdateSerializer(comment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(CommentMineSerializer(comment).data)

    @extend_schema(
        tags=COMMENT_TAG,
        summary="حذف نظر من",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="نظر پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def delete(self, request:Request, pk):
        self.get_comment(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------
# ادمین
# --------------------------------------------------------------------------
class AdminCommentBase(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [IsAdminRole]


class CommentManageListView(AdminCommentBase):
    @extend_schema(
        tags=ADMIN_COMMENT_TAG,
        summary="لیست همه‌ی نظرات (فقط ادمین)",
        description="نظرات در انتظار تأیید اول می‌آیند.",
        parameters=[CommentFilterSerializer],
        responses={200: CommentAdminSerializer(many=True), **ADMIN_RESPONSES},
    )
    def get(self, request:Request):
        filters = CommentFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        comments = Comment.objects.select_related("customer", "product").order_by(
            "is_confirmed", "-created_at"
        )
        if params.get("status") == "pending":
            comments = comments.filter(is_confirmed=False)
        elif params.get("status") == "confirmed":
            comments = comments.filter(is_confirmed=True)
        if "product" in params:
            comments = comments.filter(product__slug=params["product"])

        return Response(CommentAdminSerializer(comments, many=True).data)


class CommentManageDetailView(AdminCommentBase):
    def get_comment(self, pk):
        return get_object_or_404(
            Comment.objects.select_related("customer", "product"), pk=pk
        )

    @extend_schema(
        tags=ADMIN_COMMENT_TAG,
        summary="جزئیات نظر (فقط ادمین)",
        responses={
            200: CommentAdminSerializer,
            404: OpenApiResponse(description="نظر پیدا نشد"),
            **ADMIN_RESPONSES,
        },
    )
    def get(self, request:Request, pk):
        return Response(CommentAdminSerializer(self.get_comment(pk)).data)

    @extend_schema(
        tags=ADMIN_COMMENT_TAG,
        summary="تأیید نظر و/یا ثبت پاسخ (فقط ادمین)",
        request=CommentAdminUpdateSerializer,
        responses={
            200: CommentAdminSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="نظر پیدا نشد"),
            **ADMIN_RESPONSES,
        },
    )
    def patch(self, request:Request, pk):
        comment = self.get_comment(pk)
        serializer = CommentAdminUpdateSerializer(
            comment, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()
        return Response(CommentAdminSerializer(comment).data)

    @extend_schema(
        tags=ADMIN_COMMENT_TAG,
        summary="حذف نظر (فقط ادمین)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="نظر پیدا نشد"),
            **ADMIN_RESPONSES,
        },
    )
    def delete(self, request:Request, pk):
        self.get_comment(pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)