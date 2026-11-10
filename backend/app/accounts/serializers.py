import re
import copy
from django.contrib.auth import authenticate, password_validation
from django.db import transaction
from rest_framework import serializers

from .models import Customer, User, UserAccess, Address, Role
from .utils import normalize_phone
from .otp import OTP_LENGTH, to_ascii_digits
from .access import ADMIN_ROLE_CODE
from .access import validate_permissions as check_permissions

class PhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=20)

    def validate_phone(self, value):
        return normalize_phone(value)


class OTPVerifySerializer(PhoneSerializer):
    code = serializers.CharField(max_length=10)

    def validate_code(self, value):
        value = to_ascii_digits(value)
        if not re.fullmatch(rf"\d{{{OTP_LENGTH}}}", value):
            raise serializers.ValidationError(f"کد باید {OTP_LENGTH} رقم باشد.")
        return value


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            "id",
            "phone",
            "first_name",
            "last_name",
            "email",
            "created_at",
            "favorite_products",
        ]
        read_only_fields = ["id", "phone", "created_at"]


MAX_ADDRESSES_PER_CUSTOMER = 10

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "title",
            "address",
            "postal_code",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_postal_code(self, value):
        value = to_ascii_digits(value)  # اعداد فارسی هم قبول می‌شود
        if not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("کد پستی باید ۱۰ رقم باشد.")
        return value

    def validate(self, attrs):
        customer = self.context["request"].user

        if self.instance is None:
            if customer.addresses.count() >= MAX_ADDRESSES_PER_CUSTOMER:
                raise serializers.ValidationError(
                    f"حداکثر {MAX_ADDRESSES_PER_CUSTOMER} آدرس می‌توانید ثبت کنید."
                )
        elif self.instance.is_default and attrs.get("is_default") is False:
            raise serializers.ValidationError(
                {"is_default": "برای تغییر آدرس پیش‌فرض، آدرس دیگری را پیش‌فرض کنید."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        customer = validated_data["customer"]  # از serializer.save(customer=...) می‌آید

        # اولین آدرس همیشه پیش‌فرض است
        if not customer.addresses.exists():
            validated_data["is_default"] = True
        if validated_data.get("is_default"):
            customer.addresses.update(is_default=False)
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            instance.customer.addresses.exclude(pk=instance.pk).update(is_default=False)
        return super().update(instance, validated_data)


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs["username"],
            password=attrs["password"],
        )
        # کاربر غیرفعال هم None برمی‌گرداند؛ پیام عمداً یکسان است
        if user is None:
            raise serializers.ValidationError("نام کاربری یا رمز عبور اشتباه است.")
        attrs["user"] = user
        return attrs


# class UserAccessSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = UserAccess
#         exclude = ["id", "user"]


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