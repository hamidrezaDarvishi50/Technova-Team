from django.shortcuts import render

# Create your views here.
from accounts.authentication import CustomerJWTAuthentication, UserJWTAuthentication
from accounts.permission import IsAdminRole, IsCustomer
from django.db import transaction
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import SAFE_METHODS, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Cart, CartItem, Order, ShopSettings
from .serializers import *

CART_TAG = ["Cart"]
ORDER_TAG = ["Order"]
ADMIN_ORDER_TAG = ["Order (Admin)"]

AUTH = {401: OpenApiResponse(description="احراز هویت نشده")}
ADMIN_AUTH = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (فقط ادمین)"),
}


def order_queryset():
    return Order.objects.select_related("discount_code", "customer").prefetch_related(
        "items__product"
    )


class CustomerBase(APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes = [IsCustomer]


class AdminBase(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [IsAdminRole]


# --------------------------------------------------------------------------
# سبد خرید (مشتری)
# --------------------------------------------------------------------------
class CartView(CustomerBase):
    @extend_schema(
        tags=CART_TAG,
        summary="سبد خرید من",
        responses={200: CartSerializer, **AUTH},
    )
    def get(self, request):
        cart = services.get_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    @extend_schema(
        tags=CART_TAG,
        summary="خالی کردن سبد خرید",
        responses={204: OpenApiResponse(description="سبد خالی شد"), **AUTH},
    )
    def delete(self, request):
        CartItem.objects.filter(cart__customer=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemCreateView(CustomerBase):
    @extend_schema(
        tags=CART_TAG,
        summary="افزودن محصول به سبد",
        description="اگر محصول از قبل در سبد باشد، تعدادش اضافه می‌شود.",
        request=CartAddSerializer,
        responses={
            201: CartSerializer,
            200: CartSerializer,
            400: OpenApiResponse(description="محصول نامعتبر یا موجودی ناکافی"),
            **AUTH,
        },
    )
    def post(self, request):
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]

        with transaction.atomic():
            cart, _ = Cart.objects.get_or_create(customer=request.user)
            item, created = CartItem.objects.select_for_update().get_or_create(
                cart=cart, product=product, defaults={"quantity": 0}
            )
            new_quantity = item.quantity + quantity
            if new_quantity > product.stock:
                raise ValidationError(
                    {"quantity": f"موجودی کافی نیست (موجودی: {product.stock})."}
                )
            item.quantity = new_quantity
            item.save(update_fields=["quantity"])

        cart = services.get_cart(request.user)
        data = CartSerializer(cart, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CartItemDetailView(CustomerBase):
    def get_item(self, request, slug):
        return get_object_or_404(
            CartItem.objects.select_related("product"),
            cart__customer=request.user,
            product__slug=slug,
        )

    @extend_schema(
        tags=CART_TAG,
        summary="تغییر تعداد یک محصول در سبد",
        request=CartQuantitySerializer,
        responses={
            200: CartSerializer,
            400: OpenApiResponse(description="موجودی ناکافی"),
            404: OpenApiResponse(description="این محصول در سبد شما نیست"),
            **AUTH,
        },
    )
    def patch(self, request, slug):
        item = self.get_item(request, slug)
        serializer = CartQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]

        if quantity > item.product.stock:
            raise ValidationError(
                {"quantity": f"موجودی کافی نیست (موجودی: {item.product.stock})."}
            )
        item.quantity = quantity
        item.save(update_fields=["quantity"])

        cart = services.get_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)

    @extend_schema(
        tags=CART_TAG,
        summary="حذف یک محصول از سبد",
        responses={
            200: CartSerializer,
            404: OpenApiResponse(description="این محصول در سبد شما نیست"),
            **AUTH,
        },
    )
    def delete(self, request, slug):
        self.get_item(request, slug).delete()
        cart = services.get_cart(request.user)
        return Response(CartSerializer(cart, context={"request": request}).data)


# --------------------------------------------------------------------------
# سفارش (مشتری)
# --------------------------------------------------------------------------
class OrderListCreateView(CustomerBase):
    @extend_schema(
        tags=ORDER_TAG,
        summary="لیست سفارش‌های من",
        responses={200: OrderListSerializer(many=True), **AUTH},
    )
    def get(self, request):
        orders = Order.objects.filter(customer=request.user).prefetch_related("items")
        return Response(OrderListSerializer(orders, many=True).data)

    @extend_schema(
        tags=ORDER_TAG,
        summary="ثبت سفارش از روی سبد خرید",
        description=(
            "سبد خالی می‌شود و سفارش با وضعیت pending ساخته می‌شود. "
            "قیمت‌ها در همین لحظه ثابت می‌شوند."
        ),
        request=OrderCreateSerializer,
        responses={
            201: OrderSerializer,
            400: OpenApiResponse(description="سبد خالی، موجودی ناکافی، آدرس یا کد تخفیف نامعتبر"),
            **AUTH,
        },
    )
    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        order = services.create_order(
            request.user,
            serializer.validated_data["address"],
            serializer.validated_data.get("discount_code"),
        )
        order = order_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderPreviewView(CustomerBase):
    @extend_schema(
        tags=ORDER_TAG,
        summary="پیش‌نمایش مبلغ سفارش (بدون ثبت)",
        description="مبلغ کالاها، تخفیف، هزینه‌ی ارسال و جمع نهایی را با کد تخفیف اختیاری برمی‌گرداند.",
        request=OrderPreviewSerializer,
        responses={
            200: OrderPreviewResponseSerializer,
            400: OpenApiResponse(description="سبد خالی، موجودی ناکافی یا کد تخفیف نامعتبر"),
            **AUTH,
        },
    )
    def post(self, request):
        serializer = OrderPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = services.get_cart(request.user)
        totals = services.calculate_totals(cart, serializer.validated_data.get("discount_code"))
        discount = totals["discount"]
        return Response(
            {
                "items_price": totals["items_price"],
                "discount_code": discount.code if discount else None,
                "discount_amount": totals["discount_amount"],
                "shipping_price": totals["shipping_price"],
                "total_price": totals["total_price"],
            }
        )


class OrderDetailView(CustomerBase):
    @extend_schema(
        tags=ORDER_TAG,
        summary="جزئیات سفارش من",
        responses={
            200: OrderSerializer,
            404: OpenApiResponse(description="سفارش پیدا نشد"),
            **AUTH,
        },
    )
    def get(self, request, pk):
        order = get_object_or_404(order_queryset(), pk=pk, customer=request.user)
        return Response(OrderSerializer(order).data)


class OrderCancelView(CustomerBase):
    @extend_schema(
        tags=ORDER_TAG,
        summary="لغو سفارش (فقط در وضعیت pending)",
        request=None,
        responses={
            200: OrderSerializer,
            400: OpenApiResponse(description="سفارش قابل لغو نیست"),
            404: OpenApiResponse(description="سفارش پیدا نشد"),
            **AUTH,
        },
    )
    def post(self, request, pk):
        services.customer_cancel(pk, request.user)
        order = order_queryset().get(pk=pk)
        return Response(OrderSerializer(order).data)


# --------------------------------------------------------------------------
# مدیریت سفارش‌ها (ادمین)
# --------------------------------------------------------------------------
class OrderManageListView(AdminBase):
    @extend_schema(
        tags=ADMIN_ORDER_TAG,
        summary="لیست همه‌ی سفارش‌ها (فقط ادمین)",
        parameters=[OrderStatusSerializer],
        responses={200: OrderAdminSerializer(many=True), **ADMIN_AUTH},
    )
    def get(self, request):
        orders = order_queryset().order_by("-created_at")
        wanted = request.query_params.get("status")
        if wanted:
            if wanted not in Order.Status.values:
                raise ValidationError({"status": "وضعیت نامعتبر است."})
            orders = orders.filter(status=wanted)
        return Response(OrderAdminSerializer(orders, many=True).data)


class OrderManageDetailView(AdminBase):
    @extend_schema(
        tags=ADMIN_ORDER_TAG,
        summary="جزئیات سفارش (فقط ادمین)",
        responses={
            200: OrderAdminSerializer,
            404: OpenApiResponse(description="سفارش پیدا نشد"),
            **ADMIN_AUTH,
        },
    )
    def get(self, request, pk):
        order = get_object_or_404(order_queryset(), pk=pk)
        return Response(OrderAdminSerializer(order).data)

    @extend_schema(
        tags=ADMIN_ORDER_TAG,
        summary="تغییر وضعیت سفارش (فقط ادمین)",
        description=(
            "تغییرهای مجاز: pending→paid/cancelled، paid→shipped/cancelled، shipped→completed. "
            "موجودی محصولات فقط موقع completed کم می‌شود."
        ),
        request=OrderStatusSerializer,
        responses={
            200: OrderAdminSerializer,
            400: OpenApiResponse(description="تغییر وضعیت مجاز نیست یا موجودی کافی نیست"),
            404: OpenApiResponse(description="سفارش پیدا نشد"),
            **ADMIN_AUTH,
        },
    )
    def patch(self, request, pk):
        serializer = OrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.change_status(pk, serializer.validated_data["status"])
        order = order_queryset().get(pk=pk)
        return Response(OrderAdminSerializer(order).data)


# --------------------------------------------------------------------------
# هزینه‌ی ارسال
# --------------------------------------------------------------------------
class ShippingPriceView(APIView):
    """GET: عمومی | PATCH: فقط ادمین."""

    def _is_safe_request(self):
        request = getattr(self, "request", None)
        return request is not None and request.method in SAFE_METHODS

    def get_authenticators(self):
        if self._is_safe_request():
            return []
        return [UserJWTAuthentication()]

    def get_permissions(self):
        if self._is_safe_request():
            return [AllowAny()]
        return [IsAdminRole()]

    @extend_schema(
        tags=ORDER_TAG,
        summary="هزینه‌ی ارسال فعلی",
        responses=ShippingPriceSerializer,
    )
    def get(self, request):
        return Response(ShippingPriceSerializer(ShopSettings.load()).data)

    @extend_schema(
        tags=ADMIN_ORDER_TAG,
        summary="تغییر هزینه‌ی ارسال (فقط ادمین)",
        request=ShippingPriceSerializer,
        responses={
            200: ShippingPriceSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **ADMIN_AUTH,
        },
    )
    def patch(self, request):
        settings_obj = ShopSettings.load()
        serializer = ShippingPriceSerializer(settings_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)