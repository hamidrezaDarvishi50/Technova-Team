from rest_framework import serializers
from django.utils import timezone

from .models import *

class DiscountCodeSerializer(serializers.ModelSerializer):

    class Meta:
        model = DiscountCode
        fields = ['id', 'type', 'title', 'code', 'expires_at', 'quantity', 'used_count', 'amount', 'created_at', 'updated_at']
        read_only_fields = ['id', 'used_count', 'created_at', 'updated_at']
        extra_kwargs = {"amount": {"min_value": 1}, "quantity": {"min_value": 1}}

    def validate_code(self, value):
        return value.strip().upper()  # SALE10 و sale10 یکی حساب بشن

    def validate_expires_at(self, value):
        if self.instance is None and value <= timezone.now():
            raise serializers.ValidationError("تاریخ انقضا باید در آینده باشد.")
        return value
    
    def validate(self, attrs):
        discount_type = attrs.get('type', getattr(self.instance, 'type', None))
        amount = attrs.get('amount', getattr(self.instance, 'amount', None))
        
        if discount_type == DiscountCode.DiscountType.PERCENTAGE:
            if amount > 100:
                raise serializers.ValidationError({'amount': 'مقدار درصد نمی تواند بیشتر از 100 باشد'})

        return attrs