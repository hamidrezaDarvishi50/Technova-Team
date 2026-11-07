from accounts.utils import normalize_phone
from rest_framework import serializers

from .models import Ticket


class TicketCreateSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(max_length=20)

    class Meta:
        model = Ticket
        fields = ["full_name", "email", "phone", "subject", "message"]
        extra_kwargs = {
            "full_name": {"min_length": 2},
            "subject": {"min_length": 2},
            "message": {"min_length": 5, "max_length": 2000},
        }

    def validate_phone(self, value):
        return normalize_phone(value)  # -> 9123456789


class TicketSerializer(serializers.ModelSerializer):

    class Meta:
        model = Ticket
        fields = [
            "id",
            "full_name",
            "email",
            "phone",
            "subject",
            "message",
            "created_at",
        ]
        read_only_fields = fields


class PaginatedTicketSerializer(serializers.Serializer):

    count = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = TicketSerializer(many=True)