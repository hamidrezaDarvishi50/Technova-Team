from django.db import models

# Create your models here.

from django.conf import settings
from django.core.validators import RegexValidator
from django.utils import timezone

phone_validator = RegexValidator(r"^9\d{9}$", "شماره موبایل معتبر نیست.")


class Lead(models.Model):
    class State(models.TextChoices):
        REJECT = "reject", "Reject"  # رد شد
        IN_PROGRESS = "in_progress", "In progress"  # در حال پیگیری
        DONT_ANSWER = "dont_answer", "Don't answer"  # جواب نداد
        SUCCESS = "success", "Success"  # موفق

    class Type(models.TextChoices):
        CONTACT_FORM = "contact_form", "Contact form"  # فرم تماس با ما
        PHONE_CALL = "phone_call", "Phone call"  # تماس تلفنی
        OTHER = "other", "Other"  # سایر

    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=10, validators=[phone_validator], db_index=True)  # 9123456789
    email = models.EmailField(max_length=254, blank=True)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.OTHER, db_index=True)
    state = models.CharField(
        max_length=20, choices=State.choices, default=State.IN_PROGRESS, db_index=True
    )

    # default (نه auto_now_add) تا لید ساخته‌شده از تیکت بتواند تاریخ ساخت تیکت را بگیرد
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.full_name} ({self.phone})"


class LeadNote(models.Model):
    """تاریخچه‌ی پیگیری لید. فقط اضافه می‌شود (ویرایش و حذف ندارد)."""

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lead_notes",
    )
    content = models.TextField(blank=True)
    # اگر این ورودی همراه با تغییر وضعیت بوده
    state_from = models.CharField(max_length=20, choices=Lead.State.choices, blank=True)
    state_to = models.CharField(max_length=20, choices=Lead.State.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"Note({self.lead_id})"
