# leads/serializers.py

import re

from accounts.utils import normalize_phone
from django.db import transaction
from rest_framework import serializers

from .models import Lead, LeadNote

PHONE_RE = re.compile(r"^9\d{9}$")


# --------------------------------------------------------------------------
# تاریخچه‌ی پیگیری
# --------------------------------------------------------------------------
class LeadNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ["id", "author_name", "content", "state_from", "state_to", "created_at"]
        read_only_fields = fields

    def get_author_name(self, obj) -> str:
        user = obj.author
        if user is None:
            return ""
        return user.full_name or user.username


class LeadNoteCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000, allow_blank=False)
    # اختیاری: همزمان با ثبت یادداشت، وضعیت لید هم عوض شود
    state = serializers.ChoiceField(choices=Lead.State.choices, required=False)

    def create(self, validated_data):
        lead = self.context["lead"]
        author = self.context["request"].user
        new_state = validated_data.get("state")

        with transaction.atomic():
            note = LeadNote(lead=lead, author=author, content=validated_data["content"])
            if new_state and new_state != lead.state:
                note.state_from, note.state_to = lead.state, new_state
                lead.state = new_state
                lead.save(update_fields=["state", "updated_at"])
            note.save()
        return note


# --------------------------------------------------------------------------
# لید
# --------------------------------------------------------------------------
class LeadListSerializer(serializers.ModelSerializer):
    notes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Lead
        fields = [
            "id",
            "full_name",
            "phone",
            "email",
            "type",
            "state",
            "notes_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class LeadDetailSerializer(LeadListSerializer):
    notes = LeadNoteSerializer(many=True, read_only=True)

    class Meta(LeadListSerializer.Meta):
        fields = LeadListSerializer.Meta.fields + ["notes"]
        read_only_fields = fields


class LeadWriteSerializer(serializers.ModelSerializer):
    # validatorهای مدل روی ورودی خام اجرا می‌شوند؛ پس اول نرمالایز می‌کنیم
    phone = serializers.CharField(max_length=20)

    class Meta:
        model = Lead
        fields = ["full_name", "phone", "email", "type", "state"]
        extra_kwargs = {
            "full_name": {"min_length": 2},
            "email": {"required": False, "allow_blank": True},
        }

    def validate_phone(self, value):
        phone = normalize_phone(value)
        if not PHONE_RE.match(phone):
            raise serializers.ValidationError("شماره موبایل معتبر نیست.")
        return phone

    def update(self, instance, validated_data):
        old_state = instance.state
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            # هر تغییر وضعیت در تاریخچه ثبت می‌شود
            if instance.state != old_state:
                LeadNote.objects.create(
                    lead=instance,
                    author=self.context["request"].user,
                    state_from=old_state,
                    state_to=instance.state,
                )
        return instance


class LeadFilterSerializer(serializers.Serializer):
    """پارامترهای query لیست (برای اعتبارسنجی و swagger)."""

    state = serializers.ChoiceField(choices=Lead.State.choices, required=False)
    type = serializers.ChoiceField(choices=Lead.Type.choices, required=False)
    search = serializers.CharField(
        required=False, allow_blank=True, help_text="نام، شماره یا ایمیل"
    )
    sort = serializers.ChoiceField(
        choices=["newest", "oldest"], required=False, default="newest"
    )


class PaginatedLeadSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = LeadListSerializer(many=True)
