from django.db import models

# Create your models here.

from django.conf import settings
from django.db import models
from django.utils import timezone


class TaskType(models.Model):
    """نوع وظیفه؛ لیست قابل‌افزودن/حذف (با ساخت وظیفه هم می‌تواند ساخته شود)."""

    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Task(models.Model):
    class Importance(models.TextChoices):
        EMERGENCY = "emergency", "Emergency"
        IMPORTANT = "important", "Important"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"

    class Status(models.TextChoices):
        TODO = "todo", "To do"
        IN_PROGRESS = "in_progress", "In progress"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    class Repeat(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    subject = models.CharField(max_length=100)
    description = models.CharField(max_length=500, blank=True)
    type = models.ForeignKey(TaskType, on_delete=models.PROTECT, related_name="tasks")
    importance = models.CharField(
        max_length=20, choices=Importance.choices, default=Importance.MEDIUM, db_index=True
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.TODO, db_index=True
    )

    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="assigned_tasks", blank=True
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_tasks",
    )

    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)  # خودکار: لحظه‌ی done شدن

    file = models.FileField(upload_to="tasks/", blank=True, null=True)

    # ---- تکرار ----
    # خود وظیفه‌ی تکرارشونده، اولین نمونه است؛ نمونه‌های بعدی را Celery beat می‌سازد.
    is_periodic = models.BooleanField(default=False)
    repeat_every = models.CharField(max_length=10, choices=Repeat.choices, blank=True)
    repeat_until = models.DateField(null=True, blank=True)  # اختیاری؛ خالی = بی‌پایان
    next_run_at = models.DateTimeField(null=True, blank=True)  # زمان ساخت نمونه‌ی بعدی (خودکار)
    generated_count = models.PositiveIntegerField(default=0)  # تعداد نمونه‌های ساخته‌شده
    source = models.ForeignKey(  # نمونه‌های ساخته‌شده به وظیفه‌ی تکرارشونده‌ی مبدأ اشاره می‌کنند
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="occurrences",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["is_periodic", "next_run_at"])]

    def __str__(self):
        return self.subject

    @property
    def is_overdue(self) -> bool:
        return bool(
            self.deadline
            and self.deadline < timezone.now()
            and self.status in (self.Status.TODO, self.Status.IN_PROGRESS)
        )
