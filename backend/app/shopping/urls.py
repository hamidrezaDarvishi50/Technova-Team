from django.urls import path

from .views import *

urlpatterns = [
    # سبد خرید (مشتری)
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemCreateView.as_view(), name="cart-item-add"),
    path("cart/items/<str:slug>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    # سفارش (مشتری)
    path("orders/", OrderListCreateView.as_view(), name="order-list"),
    path("orders/preview/", OrderPreviewView.as_view(), name="order-preview"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    # مدیریت سفارش‌ها (ادمین)
    path("orders/manage/", OrderManageListView.as_view(), name="order-manage-list"),
    path("orders/manage/<int:pk>/", OrderManageDetailView.as_view(), name="order-manage-detail"),
    # هزینه‌ی ارسال
    path("shipping-price/", ShippingPriceView.as_view(), name="shipping-price"),
]