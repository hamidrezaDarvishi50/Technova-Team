from accounts.models import Address, Customer
from rest_framework import serializers
from shopping.models import Order
from shopping.serializers import OrderListSerializer

RECENT_ORDERS_COUNT = 5


class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ["id", "title", "address", "postal_code", "is_default"]
        read_only_fields = fields


class CustomerListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    # با annotate در ویو پر می‌شوند
    orders_count = serializers.IntegerField(read_only=True)
    total_spent = serializers.IntegerField(read_only=True)
    last_order_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "phone",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "is_active",
            "orders_count",
            "total_spent",
            "last_order_at",
            "created_at",
        ]
        read_only_fields = fields


class CustomerDetailSerializer(CustomerListSerializer):
    addresses = CustomerAddressSerializer(many=True, read_only=True)
    recent_orders = serializers.SerializerMethodField()

    class Meta(CustomerListSerializer.Meta):
        fields = CustomerListSerializer.Meta.fields + ["updated_at", "addresses", "recent_orders"]
        read_only_fields = fields

    def get_recent_orders(self, obj):
        orders = obj.orders.prefetch_related("items")[:RECENT_ORDERS_COUNT]
        return OrderListSerializer(orders, many=True).data


class CustomerFilterSerializer(serializers.Serializer):
    """پارامترهای query لیست (برای اعتبارسنجی و swagger)."""

    search = serializers.CharField(
        required=False, allow_blank=True, help_text="نام، نام‌خانوادگی، شماره یا ایمیل"
    )
    # default=None: بدون آن، DRF پارامتر غایب query را false حساب می‌کند (رفتار checkbox)
    is_active = serializers.BooleanField(required=False, allow_null=True, default=None)
    sort = serializers.ChoiceField(
        choices=["newest", "oldest", "most_orders", "top_spenders"],
        required=False,
        default="newest",
    )


class CustomerOrderFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices, required=False)


class PaginatedCustomerSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = CustomerListSerializer(many=True)


class PaginatedCustomerOrderSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = OrderListSerializer(many=True)
