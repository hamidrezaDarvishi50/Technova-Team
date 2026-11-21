from django.shortcuts import render

# Create your views here.
from accounts.authentication import UserJWTAuthentication
from accounts.permission import HasSectionPermission
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BlogPost, Tag
from .pagination import BlogPagination
from .serializers import *

BLOG_TAG = ["Blog"]
MANAGE_TAG = ["Blog (Manage)"]

PAGE_PARAMS = [
    OpenApiParameter("page", int, description="شماره‌ی صفحه (از ۱)"),
    OpenApiParameter("page_size", int, description="تعداد در صفحه (پیش‌فرض ۹، حداکثر ۵۰)"),
]
MANAGE_AUTH = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (دسترسی blog لازم است)"),
}


def published_posts():
    """مقاله‌های منتشرشده (انتشار زمان‌بندی‌شده‌ی آینده نمایش داده نمی‌شود)."""
    return (
        BlogPost.objects.filter(
            status=BlogPost.Status.PUBLISHED, published_at__lte=timezone.now()
        )
        .prefetch_related("tags")
    )


def manage_posts():
    return BlogPost.objects.prefetch_related("tags")


def search_filter(queryset, term):
    if term:
        queryset = queryset.filter(Q(title__icontains=term) | Q(summary__icontains=term))
    return queryset


def paginate(view, request, queryset, serializer_class):
    paginator = BlogPagination()
    page = paginator.paginate_queryset(queryset, request, view=view)
    data = serializer_class(page, many=True, context={"request": request}).data
    return paginator.get_paginated_response(data)


# --------------------------------------------------------------------------
# عمومی (بدون لاگین)
# --------------------------------------------------------------------------
class PublicBlogBase(APIView):
    # توکن (حتی منقضی یا مشتری) نباید مانع دیدن مقاله‌ها شود
    authentication_classes = []
    permission_classes = [AllowAny]


class BlogPostListView(PublicBlogBase):
    @extend_schema(
        tags=BLOG_TAG,
        summary="لیست مقاله‌های منتشرشده",
        description="جدیدترین‌ها اول. فیلتر با tag (slug) و جستجو در عنوان و خلاصه.",
        parameters=[BlogFilterSerializer, *PAGE_PARAMS],
        responses={
            200: PaginatedBlogPostSerializer,
            400: OpenApiResponse(description="پارامتر نامعتبر"),
            404: OpenApiResponse(description="شماره‌ی صفحه نامعتبر"),
        },
    )
    def get(self, request):
        filters = BlogFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        queryset = published_posts().order_by("-published_at", "-id")
        if "tag" in params:
            queryset = queryset.filter(tags__slug=params["tag"])
        queryset = search_filter(queryset, params.get("search"))
        return paginate(self, request, queryset, BlogPostCardSerializer)


class BlogPostDetailView(PublicBlogBase):
    @extend_schema(
        tags=BLOG_TAG,
        summary="جزئیات یک مقاله",
        responses={
            200: BlogPostDetailSerializer,
            404: OpenApiResponse(description="مقاله پیدا نشد"),
        },
    )
    def get(self, request, slug):
        post = get_object_or_404(published_posts(), slug=slug)
        return Response(BlogPostDetailSerializer(post, context={"request": request}).data)


class BlogTagListView(PublicBlogBase):
    @extend_schema(
        tags=BLOG_TAG,
        summary="تگ‌ها (فقط دارای مقاله‌ی منتشرشده) با تعداد مقاله",
        responses=TagCountSerializer(many=True),
    )
    def get(self, request):
        live = Q(posts__status=BlogPost.Status.PUBLISHED, posts__published_at__lte=timezone.now())
        tags = (
            Tag.objects.annotate(posts_count=Count("posts", filter=live, distinct=True))
            .filter(posts_count__gt=0)
            .order_by("-posts_count", "name")
        )
        return Response(TagCountSerializer(tags, many=True).data)


# --------------------------------------------------------------------------
# مدیریت (دسترسی بخش blog)
# --------------------------------------------------------------------------
class BlogManageBase(APIView):
    """GET=view، POST=create، PATCH=edit، DELETE=delete روی بخش «blog»."""

    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "blog"
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class BlogPostManageListView(BlogManageBase):
    @extend_schema(
        tags=MANAGE_TAG,
        summary="لیست همه‌ی مقاله‌ها با پیش‌نویس‌ها",
        parameters=[BlogManageFilterSerializer, *PAGE_PARAMS],
        responses={200: PaginatedBlogManageSerializer, **MANAGE_AUTH},
    )
    def get(self, request):
        filters = BlogManageFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        queryset = manage_posts().order_by("-created_at", "-id")
        if "status" in params:
            queryset = queryset.filter(status=params["status"])
        if "tag" in params:
            queryset = queryset.filter(tags__slug=params["tag"])
        queryset = search_filter(queryset, params.get("search"))
        return paginate(self, request, queryset, BlogPostManageListSerializer)

    @extend_schema(
        tags=MANAGE_TAG,
        summary="ساخت مقاله",
        description=(
            "tags لیستی از نام تگ‌هاست (تگ جدید خودکار ساخته می‌شود). "
            "با status=published مقاله منتشر می‌شود و published_at اگر ندهی همین لحظه است؛ "
            "تاریخ آینده یعنی انتشار زمان‌بندی‌شده."
        ),
        request=BlogPostWriteSerializer,
        responses={
            201: BlogPostManageSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **MANAGE_AUTH,
        },
    )
    def post(self, request):
        serializer = BlogPostWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        post = serializer.save()

        post = manage_posts().get(pk=post.pk)
        data = BlogPostManageSerializer(post, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class BlogPostManageDetailView(BlogManageBase):
    @extend_schema(
        tags=MANAGE_TAG,
        summary="جزئیات مقاله (با پیش‌نویس)",
        responses={
            200: BlogPostManageSerializer,
            404: OpenApiResponse(description="مقاله پیدا نشد"),
            **MANAGE_AUTH,
        },
    )
    def get(self, request, pk):
        post = get_object_or_404(manage_posts(), pk=pk)
        return Response(BlogPostManageSerializer(post, context={"request": request}).data)

    @extend_schema(
        tags=MANAGE_TAG,
        summary="ویرایش مقاله",
        description="با slug جدید می‌شود آدرس مقاله را عوض کرد؛ با تغییر عنوان، slug تغییر نمی‌کند.",
        request=BlogPostWriteSerializer,
        responses={
            200: BlogPostManageSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="مقاله پیدا نشد"),
            **MANAGE_AUTH,
        },
    )
    def patch(self, request, pk):
        post = get_object_or_404(BlogPost, pk=pk)
        serializer = BlogPostWriteSerializer(
            post, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        post = manage_posts().get(pk=pk)
        return Response(BlogPostManageSerializer(post, context={"request": request}).data)

    @extend_schema(
        tags=MANAGE_TAG,
        summary="حذف مقاله",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="مقاله پیدا نشد"),
            **MANAGE_AUTH,
        },
    )
    def delete(self, request, pk):
        post = get_object_or_404(BlogPost, pk=pk)
        image = post.image
        post.delete()
        if image:
            image.delete(save=False)  # فایل تصویر هم پاک شود
        return Response(status=status.HTTP_204_NO_CONTENT)