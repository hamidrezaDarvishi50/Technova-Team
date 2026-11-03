from accounts.models import Address
from products.models import Product
from rest_framework import serializers

from .models import Cart, CartItem, Order, OrderItem, ShopSettings


# --------------------------------------------------------------------------
# سبد خرید
# --------------------------------------------------------------------------
class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    image = serializers.ImageField(source="product.image", read_only=True)
    stock = serializers.IntegerField(source="product.stock", read_only=True)
    unit_price = serializers.IntegerField(read_only=True)
    line_total = serializers.IntegerField(read_only=True)
    available = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "product",
            "product_name",
            "image",
            "quantity",
            "unit_price",
            "line_total",
            "stock",
            "available",
        ]
        read_only_fields = fields

    def get_available(self, obj) -> bool:
        return obj.quantity <= obj.product.stock


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    total_price = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cart
        fields = ["items", "items_count", "total_price"]
        read_only_fields = fields

    def get_items_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())


class CartAddSerializer(serializers.Serializer):
    product = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Product.objects.all(),
        error_messages={"does_not_exist": "محصولی با این slug وجود ندارد."},
    )
    quantity = serializers.IntegerField(min_value=1, default=1)


class CartQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)


# --------------------------------------------------------------------------
# سفارش
# --------------------------------------------------------------------------
class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    line_total = serializers.IntegerField(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["product", "product_name", "quantity", "unit_price", "line_total"]
        read_only_fields = fields


class OrderListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "status", "items_count", "total_price", "created_at"]
        read_only_fields = fields

    def get_items_count(self, obj) -> int:
        return sum(item.quantity for item in obj.items.all())


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    discount_code = serializers.CharField(
        source="discount_code.code", read_only=True, allow_null=True
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "address",
            "shipping_address",
            "shipping_postal_code",
            "discount_code",
            "discount_amount",
            "shipping_price",
            "items_price",
            "total_price",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "items",
        ]
        read_only_fields = fields


class OrderAdminSerializer(OrderSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["customer", "customer_name", "customer_phone"]
        read_only_fields = fields

    def get_customer_name(self, obj) -> str:
        return f"{obj.customer.first_name} {obj.customer.last_name}".strip()


class OrderPreviewSerializer(serializers.Serializer):
    discount_code = serializers.CharField(required=False, allow_blank=True, max_length=50)


class OrderPreviewResponseSerializer(serializers.Serializer):
    items_price = serializers.IntegerField()
    discount_code = serializers.CharField(allow_null=True)
    discount_amount = serializers.IntegerField()
    shipping_price = serializers.IntegerField()
    total_price = serializers.IntegerField()


class OrderCreateSerializer(OrderPreviewSerializer):
    address = serializers.IntegerField(help_text="شناسه‌ی یکی از آدرس‌های خود مشتری")

    def validate_address(self, value):
        customer = self.context["request"].user
        address = Address.objects.filter(pk=value, customer=customer).first()
        if address is None:
            raise serializers.ValidationError("آدرس نامعتبر است.")
        return address


class OrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)


# --------------------------------------------------------------------------
# هزینه‌ی ارسال
# --------------------------------------------------------------------------
class ShippingPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShopSettings
        fields = ["shipping_price", "updated_at"]
        read_only_fields = ["updated_at"]