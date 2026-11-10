from rest_framework.permissions import BasePermission

from .models import Customer, User

ACTION_BY_METHOD = {
    "GET": "view",
    "HEAD": "view",
    "OPTIONS": "view",
    "POST": "create",
    "PUT": "edit",
    "PATCH": "edit",
    "DELETE": "delete",
}


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, Customer)


class IsStaffUser(BasePermission):
    """هر کارمند فعال پنل (User)."""

    def has_permission(self, request, view):
        return isinstance(request.user, User) and request.user.is_active


class IsAdminRole(BasePermission):
    """فقط نقش admin (مدیریت کاربران و نقش‌ها)."""

    def has_permission(self, request, view):
        user = request.user
        return isinstance(user, User) and user.is_active and user.is_admin


class HasSectionPermission(BasePermission):
    """
    دسترسی بر اساس بخش و متد HTTP (GET=view، POST=create، PATCH=edit، DELETE=delete).

    روی ویو باید تعریف شود:
        permission_section = "products"
    و در صورت نیاز برای تغییر نگاشت متد به اکشن:
        permission_actions = {"POST": "edit"}

    اگر permission_section تعریف نشده باشد، همه چیز رد می‌شود (fail closed).
    نقش admin همیشه مجاز است. متدی که ویو ندارد (مثلاً حذف تیکت)، 405 می‌گیرد و
    اکشنش بی‌اثر است.
    """

    def has_permission(self, request, view):
        user = request.user
        if not (isinstance(user, User) and user.is_active):
            return False

        section = getattr(view, "permission_section", None)
        if section is None:
            return False

        overrides = getattr(view, "permission_actions", {})
        action = overrides.get(request.method) or ACTION_BY_METHOD.get(request.method)
        if action is None:
            return False
        return user.has_permission(section, action)