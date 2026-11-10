from django.test import TestCase

# Create your tests here.


# accounts/serializers.py
# - UserAccessSerializer، UserSerializer و UserWriteSerializer قبلی را حذف و با این‌ها جایگزین کن
# - importهای زیر را به بالای فایل اضافه کن (تکراری‌ها را ادغام کن)

import copy

from django.db import transaction
from rest_framework import serializers

from .access import ADMIN_ROLE_CODE
from .access import validate_permissions as check_permissions
from .models import Role, User, UserAccess
from .utils import normalize_phone


# --------------------------------------------------------------------------
# نقش‌ها
# --------------------------------------------------------------------------
class RoleSerializer(serializers.ModelSerializer):
    users_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Role
        fields = [
            "id",
            "name",
            "code",
            "default_permissions",
            "is_system",
            "users_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "users_count", "created_at", "updated_at"]

    def validate_code(self, value):
        value = value.strip().lower()
        if self.instance and self.instance.is_system and value != self.instance.code:
            raise serializers.ValidationError("کد نقش سیستمی قابل تغییر نیست.")
        return value

    def validate_default_permissions(self, value):
        return check_permissions(value)


# --------------------------------------------------------------------------
# کاربران
# --------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    """خروجی (خواندن) کاربر؛ بدون پسورد."""

    role = serializers.SlugRelatedField(slug_field="code", read_only=True)
    role_name = serializers.CharField(source="role.name", read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "phone",
            "first_name",
            "last_name",
            "email",
            "role",
            "role_name",
            "is_admin",
            "is_active",
            "permissions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_permissions(self, obj) -> dict:
        # برای admin فرانت باید به is_admin نگاه کند (دسترسی کامل)
        access = getattr(obj, "access", None)
        return access.permissions if access else {}


class UserWriteSerializer(serializers.ModelSerializer):
    """ساخت/ویرایش کاربر توسط ادمین."""

    phone = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, max_length=20
    )
    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    role = serializers.SlugRelatedField(
        slug_field="code",
        queryset=Role.objects.all(),
        error_messages={"does_not_exist": "نقشی با این کد وجود ندارد."},
    )
    permissions = serializers.JSONField(
        write_only=True,
        required=False,
        help_text="اختیاری؛ اگر ندهی، دسترسی پیش‌فرض نقش اعمال می‌شود.",
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "phone",
            "first_name",
            "last_name",
            "email",
            "role",
            "is_active",
            "permissions",
        ]
        read_only_fields = ["id"]

    def validate_phone(self, value):
        if not value:
            return None
        phone = normalize_phone(value)
        qs = User.objects.filter(phone=phone)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این شماره قبلاً ثبت شده است.")
        return phone

    def validate_password(self, value):
        from django.contrib.auth import password_validation

        password_validation.validate_password(value, user=self.instance)
        return value

    def validate_permissions(self, value):
        return check_permissions(value)

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "رمز عبور الزامی است."})

        # ادمین نباید خودش را از ادمینی بیندازد یا غیرفعال کند
        request = self.context.get("request")
        if self.instance and request and self.instance.pk == request.user.pk:
            new_role = attrs.get("role", self.instance.role)
            if new_role.code != ADMIN_ROLE_CODE or attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    "نمی‌توانید نقش یا وضعیت حساب خودتان را تنزل دهید."
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        permissions = validated_data.pop("permissions", None)
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)

        if permissions is None:
            permissions = copy.deepcopy(user.role.default_permissions)
        UserAccess.objects.create(user=user, permissions=permissions)
        return user

    @transaction.atomic
    def update(self, instance, validated_data):
        permissions = validated_data.pop("permissions", None)
        password = validated_data.pop("password", None)

        new_role = validated_data.get("role")
        role_changed = new_role is not None and new_role.pk != instance.role_id

        for field, value in validated_data.items():
            setattr(instance, field, value)
        if password:
            instance.set_password(password)
        if role_changed:
            instance.is_staff = new_role.code == ADMIN_ROLE_CODE
        instance.save()

        if permissions is not None:
            # دسترسی صریحی که در همین درخواست آمده، اولویت دارد
            UserAccess.objects.update_or_create(
                user=instance, defaults={"permissions": permissions}
            )
        elif role_changed:
            # تغییر نقش: همه‌ی دسترسی‌ها به پیش‌فرض نقش جدید می‌روند
            instance.reset_permissions_to_role_default()
        return instance

    def to_representation(self, instance):
        fresh = User.objects.select_related("role", "access").get(pk=instance.pk)
        return UserSerializer(fresh, context=self.context).data