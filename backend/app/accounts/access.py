"""
تعریف بخش‌ها و اکشن‌های قابل‌تنظیم دسترسی + اعتبارسنجی JSON دسترسی‌ها.

قالب JSON دسترسی (هم برای Role.default_permissions و هم UserAccess.permissions):
{
  "products": {"view": true, "create": true, "edit": true, "delete": false},
  "orders":   {"view": true, "edit": true, "statuses": ["paid"]}
}
بخش یا اکشنی که نیامده باشد یعنی ممنوع. نقش admin همیشه دسترسی کامل دارد.
"""

from rest_framework.exceptions import ValidationError

ADMIN_ROLE_CODE = "admin"

# مدیریت کاربران و نقش‌ها عمداً در این لیست نیست: فقط admin (جلوگیری از privilege escalation)
SECTIONS = [
    "dashboard",
    "orders",
    "products",  # شامل دسته‌بندی‌ها
    "discounts",
    "comments",
    "tickets",
    "settings",  # مثل هزینه‌ی ارسال
    "customers",
    "leads",
    "tasks",
]
ACTIONS = ["view", "create", "edit", "delete"]

# وضعیت‌هایی که یک کارمند (غیرادمین) می‌تواند برای سفارش ست کند
ORDER_STATUSES = ["paid", "shipped", "completed", "cancelled"]


def validate_permissions(data):
    if not isinstance(data, dict):
        raise ValidationError("permissions باید یک آبجکت JSON باشد.")

    for section, rules in data.items():
        if section not in SECTIONS:
            raise ValidationError(f"بخش «{section}» نامعتبر است.")
        if not isinstance(rules, dict):
            raise ValidationError(f"تنظیمات بخش «{section}» باید یک آبجکت باشد.")

        for key, value in rules.items():
            if key in ACTIONS:
                if not isinstance(value, bool):
                    raise ValidationError(f"«{section}.{key}» باید true یا false باشد.")
            elif key == "statuses" and section == "orders":
                if not isinstance(value, list) or any(s not in ORDER_STATUSES for s in value):
                    raise ValidationError(
                        f"«orders.statuses» باید لیستی از {ORDER_STATUSES} باشد."
                    )
            else:
                raise ValidationError(f"کلید «{key}» در بخش «{section}» نامعتبر است.")
    return data