from django.db import models

# Create your models here.
class DiscountCode(models.Model):

    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage"
        FIXED = "fixed", "Fixed"

    type = models.CharField(max_length=20, choices=DiscountType.choices)
    title = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    expires_at = models.DateTimeField()
    quantity = models.PositiveIntegerField()
    used_count = models.PositiveIntegerField(default=0)
    amount = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)