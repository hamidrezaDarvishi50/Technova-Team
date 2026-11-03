# به serializers.py اپ products اضافه کن (Comment را از .models import کن)

from rest_framework import serializers

from .models import Comment

COMMENT_FIELD_RULES = {"content": {"min_length": 3}}


def _full_name(customer) -> str:
    return f"{customer.first_name} {customer.last_name}".strip()


# ---------- خروجی عمومی (کاربران سایت) ----------
class CommentPublicSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "customer_name", "rating", "content", "reply", "created_at"]
        read_only_fields = fields

    def get_customer_name(self, obj) -> str:
        return obj.customer.first_name or "کاربر تکنوا"


# ---------- خروجی برای صاحب نظر ----------
class CommentMineSerializer(serializers.ModelSerializer):
    product = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "product",
            "product_name",
            "rating",
            "content",
            "reply",
            "is_confirmed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


# ---------- ورودی مشتری ----------
class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["rating", "content"]
        extra_kwargs = COMMENT_FIELD_RULES

    def validate(self, attrs):
        request = self.context["request"]
        product = self.context["product"]
        if Comment.objects.filter(customer=request.user, product=product).exists():
            raise serializers.ValidationError("شما قبلاً برای این محصول نظر ثبت کرده‌اید.")
        return attrs


class CommentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ["rating", "content"]
        extra_kwargs = COMMENT_FIELD_RULES

    def update(self, instance, validated_data):
        instance.is_confirmed = False  # بعد از ویرایش دوباره باید تأیید شود
        return super().update(instance, validated_data)


# ---------- ادمین ----------
class CommentAdminSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    product = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "customer",
            "customer_name",
            "customer_phone",
            "product",
            "product_name",
            "rating",
            "content",
            "reply",
            "is_confirmed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj) -> str:
        return _full_name(obj.customer)


class CommentAdminUpdateSerializer(serializers.ModelSerializer):
    """ادمین فقط تأیید و پاسخ را عوض می‌کند، نه متن مشتری را."""

    class Meta:
        model = Comment
        fields = ["is_confirmed", "reply"]


class CommentFilterSerializer(serializers.Serializer):
    """query params لیست مدیریت نظرات."""

    status = serializers.ChoiceField(
        choices=["pending", "confirmed"],
        required=False,
        help_text="pending=در انتظار تأیید، confirmed=تأییدشده",
    )
    product = serializers.SlugField(
        required=False, allow_unicode=True, help_text="slug محصول"
    )