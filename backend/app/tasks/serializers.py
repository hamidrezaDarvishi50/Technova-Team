# tasks/serializers.py

import os

from accounts.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Task, TaskType
from .services import compute_next_run

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_FILE_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
    ".png", ".jpg", ".jpeg", ".zip",
}  # fmt: skip


def normalize_type_name(value: str) -> str:
    return " ".join(value.split())  # فاصله‌های اضافه حذف می‌شود


def get_or_create_type(name: str) -> TaskType:
    """نوع را بدون حساسیت به حروف پیدا می‌کند و اگر نبود می‌سازد (مثل تگ‌های بلاگ)."""
    existing = TaskType.objects.filter(name__iexact=name).first()
    if existing:
        return existing
    obj, _ = TaskType.objects.get_or_create(name=name)
    return obj


# --------------------------------------------------------------------------
# نوع وظیفه
# --------------------------------------------------------------------------
class TaskTypeSerializer(serializers.ModelSerializer):
    tasks_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TaskType
        fields = ["id", "name", "tasks_count"]
        read_only_fields = ["id", "tasks_count"]

    def validate_name(self, value):
        value = normalize_type_name(value)
        if not value:
            raise serializers.ValidationError("نام نوع نمی‌تواند خالی باشد.")
        if TaskType.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError("این نوع قبلاً وجود دارد.")
        return value


# --------------------------------------------------------------------------
# خروجی وظیفه
# --------------------------------------------------------------------------
class UserBriefSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "name"]
        read_only_fields = fields

    def get_name(self, obj) -> str:
        return obj.full_name or obj.username


class TaskListSerializer(serializers.ModelSerializer):
    type = serializers.CharField(source="type.name", read_only=True)
    created_by = UserBriefSerializer(read_only=True)
    assigned_to = UserBriefSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "subject",
            "type",
            "importance",
            "status",
            "assigned_to",
            "created_by",
            "start_at",
            "end_at",
            "deadline",
            "is_overdue",
            "is_periodic",
            "repeat_every",
            "created_at",
        ]
        read_only_fields = fields


class TaskDetailSerializer(TaskListSerializer):
    file = serializers.FileField(read_only=True)

    class Meta(TaskListSerializer.Meta):
        fields = TaskListSerializer.Meta.fields + [
            "description",
            "file",
            "completed_at",
            "repeat_until",
            "next_run_at",
            "generated_count",
            "source",
            "updated_at",
        ]
        read_only_fields = fields


# --------------------------------------------------------------------------
# ورودی وظیفه (ساخت و ویرایش)
# --------------------------------------------------------------------------
class TaskWriteSerializer(serializers.ModelSerializer):
    type = serializers.CharField(max_length=50, help_text="نام نوع؛ اگر وجود نداشته باشد ساخته می‌شود")
    assigned_to = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.filter(is_active=True),
        allow_empty=False,
        help_text="شناسه‌ی کارمندان مسئول",
    )

    class Meta:
        model = Task
        fields = [
            "subject",
            "description",
            "type",
            "importance",
            "status",
            "assigned_to",
            "start_at",
            "end_at",
            "deadline",
            "file",
            "is_periodic",
            "repeat_every",
            "repeat_until",
        ]
        extra_kwargs = {
            "subject": {"min_length": 2},
            "description": {"required": False, "allow_blank": True},
            "repeat_every": {"required": False, "allow_null": True, "allow_blank": True},
            "repeat_until": {"required": False, "allow_null": True},
            "file": {"required": False, "allow_null": True},
        }

    # ---- اعتبارسنجی ----
    def validate_type(self, value):
        value = normalize_type_name(value)
        if not value:
            raise serializers.ValidationError("نوع وظیفه الزامی است.")
        return value

    def validate_file(self, value):
        if value is None:
            return value
        if os.path.splitext(value.name)[1].lower() not in ALLOWED_FILE_EXTENSIONS:
            raise serializers.ValidationError("فرمت فایل مجاز نیست.")
        if value.size > MAX_FILE_SIZE:
            raise serializers.ValidationError("حجم فایل نباید بیشتر از ۵ مگابایت باشد.")
        return value

    def _effective(self, attrs, name, default=None):
        """مقدار جدید اگر در درخواست بود، وگرنه مقدار فعلی وظیفه (برای PATCH)."""
        if name in attrs:
            return attrs[name]
        return getattr(self.instance, name, default) if self.instance else default

    def validate(self, attrs):
        start = self._effective(attrs, "start_at")
        end = self._effective(attrs, "end_at")
        deadline = self._effective(attrs, "deadline")
        if start and end and end < start:
            raise serializers.ValidationError({"end_at": "end_at نمی‌تواند قبل از start_at باشد."})
        if start and deadline and deadline < start:
            raise serializers.ValidationError({"deadline": "deadline نمی‌تواند قبل از start_at باشد."})

        if self._effective(attrs, "is_periodic", False):
            if not self._effective(attrs, "repeat_every"):
                raise serializers.ValidationError(
                    {"repeat_every": "برای وظیفه‌ی تکرارشونده الزامی است (daily/weekly/monthly/yearly)."}
                )
            if not start:
                raise serializers.ValidationError(
                    {"start_at": "برای وظیفه‌ی تکرارشونده start_at الزامی است."}
                )
            until = self._effective(attrs, "repeat_until")
            if until and until < timezone.localtime(start).date():
                raise serializers.ValidationError(
                    {"repeat_until": "repeat_until نمی‌تواند قبل از start_at باشد."}
                )
        else:
            attrs["repeat_every"] = ""
            attrs["repeat_until"] = None

        if "repeat_every" in attrs and attrs["repeat_every"] is None:
            attrs["repeat_every"] = ""
        return attrs

    # ---- ذخیره ----
    @staticmethod
    def _sync_completed_at(task):
        if task.status == Task.Status.DONE:
            task.completed_at = task.completed_at or timezone.now()
        else:
            task.completed_at = None

    def create(self, validated_data):
        type_name = validated_data.pop("type")
        assignees = validated_data.pop("assigned_to")
        with transaction.atomic():
            task = Task(
                type=get_or_create_type(type_name),
                created_by=self.context["request"].user,
                **validated_data,
            )
            self._sync_completed_at(task)
            task.next_run_at = compute_next_run(task)
            task.save()
            task.assigned_to.set(assignees)
        return task

    def update(self, instance, validated_data):
        type_name = validated_data.pop("type", None)
        assignees = validated_data.pop("assigned_to", None)
        old_file = instance.file.name if "file" in validated_data and instance.file else None

        with transaction.atomic():
            if type_name:
                instance.type = get_or_create_type(type_name)
            for key, value in validated_data.items():
                setattr(instance, key, value)
            self._sync_completed_at(instance)
            instance.next_run_at = compute_next_run(instance)
            instance.save()
            if assignees is not None:
                instance.assigned_to.set(assignees)

        # اگر فایل عوض شد، فایل قبلی روی دیسک نماند
        new_name = instance.file.name if instance.file else None
        if old_file and old_file != new_name:
            instance.file.storage.delete(old_file)
        return instance


# --------------------------------------------------------------------------
# فیلتر لیست + مستندات swagger
# --------------------------------------------------------------------------
class TaskFilterSerializer(serializers.Serializer):
    scope = serializers.ChoiceField(
        choices=["assigned", "created", "all"],
        required=False,
        default="assigned",
        help_text="assigned: برای من | created: تعریف‌شده توسط من | all: همه (نیازمند tasks.view)",
    )
    status = serializers.ChoiceField(choices=Task.Status.choices, required=False)
    importance = serializers.ChoiceField(choices=Task.Importance.choices, required=False)
    type = serializers.CharField(required=False, allow_blank=True, help_text="نام نوع")
    # default=None: بدون آن، DRF پارامتر غایب query را false حساب می‌کند (رفتار checkbox)
    overdue = serializers.BooleanField(required=False, allow_null=True, default=None)
    search = serializers.CharField(required=False, allow_blank=True, help_text="عنوان")
    sort = serializers.ChoiceField(
        choices=["newest", "oldest", "deadline", "importance"], required=False, default="newest"
    )


class PaginatedTaskSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = TaskListSerializer(many=True)
