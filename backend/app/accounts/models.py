import copy

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models

from .access import ADMIN_ROLE_CODE
from .utils import normalize_phone

phone_validator = RegexValidator(r"^9\d{9}$", "شماره موبایل معتبر نیست.")


class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.SlugField(max_length=50, unique=True)  # مثل sales (لاتین)
    # دسترسی پیش‌فرض نقش؛ موقع ساخت کاربر یا تغییر نقش، در UserAccess کپی می‌شود
    default_permissions = models.JSONField(default=dict, blank=True)
    is_system = models.BooleanField(default=False)  # نقش‌های سیستمی (admin) حذف نمی‌شوند

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    @classmethod
    def get_admin(cls):
        role, _ = cls.objects.get_or_create(
            code=ADMIN_ROLE_CODE,
            defaults={"name": "Admin", "is_system": True},
        )
        return role


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, username, password=None, role=None, **extra_fields):
        if not username:
            raise ValueError("username الزامی است.")
        if role is None:
            raise ValueError("role الزامی است.")
        # به /admin/ خود جنگو فقط نقش admin دسترسی دارد
        extra_fields.setdefault("is_staff", role.code == ADMIN_ROLE_CODE)
        user = self.model(username=username, role=role, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, password, role=Role.get_admin(), **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=50, unique=True)
    phone = models.CharField(
        max_length=10, unique=True, null=True, blank=True, validators=[phone_validator]
    )
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(max_length=100, blank=True)
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="users")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # برای دسترسی به django admin

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.username

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def is_admin(self) -> bool:
        return self.role.code == ADMIN_ROLE_CODE

    # ---- دسترسی‌ها ----
    def _rules(self, section: str) -> dict:
        access = getattr(self, "access", None)  # اگر ردیف نداشته باشد None
        if access is None:
            return {}
        return access.permissions.get(section) or {}

    def has_permission(self, section: str, action: str = "view") -> bool:
        if not self.is_active:
            return False
        if self.is_admin:
            return True
        return self._rules(section).get(action) is True

    def can_set_order_status(self, status: str) -> bool:
        if self.is_admin:
            return True
        return status in (self._rules("orders").get("statuses") or [])

    def reset_permissions_to_role_default(self):
        UserAccess.objects.update_or_create(
            user=self,
            defaults={"permissions": copy.deepcopy(self.role.default_permissions)},
        )

    def save(self, *args, **kwargs):
        self.phone = normalize_phone(self.phone) if self.phone else None
        super().save(*args, **kwargs)


class UserAccess(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="access")
    # قالب: به access.py نگاه کن
    permissions = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Access({self.user_id})"


class Customer(models.Model):
    phone = models.CharField(max_length=10, unique=True, validators=[phone_validator])
    first_name = models.CharField(max_length=50, blank=True)
    last_name = models.CharField(max_length=50, blank=True)
    email = models.EmailField(max_length=100, blank=True)
    favorite_products = models.ManyToManyField(
        "products.Product",
        related_name="favorited_by",
        blank=True,
        db_table="favorite_item",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.phone

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def save(self, *args, **kwargs):
        if self.phone:
            self.phone = normalize_phone(self.phone)
        super().save(*args, **kwargs)


class Address(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="addresses")
    title = models.CharField(max_length=50, blank=True)  # مثلا خانه / محل کار
    address = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)