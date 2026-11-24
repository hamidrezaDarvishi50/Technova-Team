from django.shortcuts import render

# Create your views here.

from accounts.authentication import UserJWTAuthentication
from accounts.models import Customer
from accounts.permission import HasSectionPermission
from django.db.models import Count, Max, Q, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.response import Response
from rest_framework.views import APIView
from shopping.models import Order
from shopping.serializers import OrderListSerializer

from .pagination import CustomerPagination
from .serializers import *

CUSTOMER_TAG = ["Customers"]
AUTH_ERRORS = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (customers)"),
}
PAGE_PARAMS = [
    OpenApiParameter("page", int, description="شماره‌ی صفحه (از ۱)"),
    OpenApiParameter("page_size", int, description="تعداد در صفحه (پیش‌فرض ۲۰، حداکثر ۱۰۰)"),
]

# سفارش‌هایی که در «مجموع خرید» حساب می‌شوند (pending و cancelled نه)
SPENT_STATUSES = [Order.Status.PAID, Order.Status.SHIPPED, Order.Status.COMPLETED]

SORT_ORDERING = {
    "newest": ("-created_at", "-id"),
    "oldest": ("created_at", "id"),
    "most_orders": ("-orders_count", "-id"),
    "top_spenders": ("-total_spent", "-id"),
}


def customers_queryset():
    # فقط یک join روی orders است، پس Count و Sum دوبار شمرده نمی‌شوند
    return Customer.objects.annotate(
        orders_count=Count("orders"),
        total_spent=Coalesce(
            Sum("orders__total_price", filter=Q(orders__status__in=SPENT_STATUSES)), 0
        ),
        last_order_at=Max("orders__created_at"),
    )


def apply_search(queryset, search):
    # هر کلمه باید در یکی از فیلدها باشد؛ پس «علی رضایی» هم پیدا می‌شود
    for token in search.split():
        if not token.strip("0"):
            continue  # فقط صفر (مثل «0» یا «00») معنایی ندارد
        cond = (
            Q(first_name__icontains=token)
            | Q(last_name__icontains=token)
            | Q(email__icontains=token)
        )
        cond |= Q(phone__icontains=token.lstrip("0"))  # 0912... همان 912... ذخیره‌شده است
        queryset = queryset.filter(cond)
    return queryset


class CustomerBaseView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [HasSectionPermission]
    permission_section = "customers"


class CustomerListView(CustomerBaseView):
    @extend_schema(
        tags=CUSTOMER_TAG,
        summary="لیست مشتری‌ها (نیازمند customers.view)",
        description=(
            "total_spent مجموع سفارش‌های paid، shipped و completed است. "
            "sort: newest | oldest | most_orders | top_spenders"
        ),
        parameters=[CustomerFilterSerializer, *PAGE_PARAMS],
        responses={
            200: PaginatedCustomerSerializer,
            400: OpenApiResponse(description="پارامتر نامعتبر"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request):
        filters = CustomerFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)
        params = filters.validated_data

        queryset = customers_queryset()
        if params.get("is_active") is not None:
            queryset = queryset.filter(is_active=params["is_active"])
        search = (params.get("search") or "").strip()
        if search:
            queryset = apply_search(queryset, search)
        queryset = queryset.order_by(*SORT_ORDERING[params["sort"]])

        paginator = CustomerPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        return paginator.get_paginated_response(CustomerListSerializer(page, many=True).data)


class CustomerDetailView(CustomerBaseView):
    @extend_schema(
        tags=CUSTOMER_TAG,
        summary="جزئیات مشتری: آدرس‌ها، آمار و آخرین سفارش‌ها (نیازمند customers.view)",
        description="برای همه‌ی سفارش‌ها از /customers/<id>/orders/ استفاده کن.",
        responses={
            200: CustomerDetailSerializer,
            404: OpenApiResponse(description="مشتری پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request, pk):
        customer = get_object_or_404(
            customers_queryset().prefetch_related("addresses"), pk=pk
        )
        return Response(CustomerDetailSerializer(customer).data)


class CustomerOrderListView(CustomerBaseView):
    @extend_schema(
        tags=CUSTOMER_TAG,
        summary="لیست سفارش‌های یک مشتری (نیازمند customers.view)",
        description="جدیدترین‌ها اول. جزئیات هر سفارش در /shopping/orders/manage/<id>/ است.",
        parameters=[CustomerOrderFilterSerializer, *PAGE_PARAMS],
        responses={
            200: PaginatedCustomerOrderSerializer,
            400: OpenApiResponse(description="پارامتر نامعتبر"),
            404: OpenApiResponse(description="مشتری پیدا نشد"),
            **AUTH_ERRORS,
        },
    )
    def get(self, request, pk):
        customer = get_object_or_404(Customer, pk=pk)
        filters = CustomerOrderFilterSerializer(data=request.query_params)
        filters.is_valid(raise_exception=True)

        orders = customer.orders.prefetch_related("items")
        if "status" in filters.validated_data:
            orders = orders.filter(status=filters.validated_data["status"])

        paginator = CustomerPagination()
        page = paginator.paginate_queryset(orders, request, view=self)
        return paginator.get_paginated_response(OrderListSerializer(page, many=True).data)
