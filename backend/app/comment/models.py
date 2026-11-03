from django.db import models

# Create your models here.
# به models.py اپ products اضافه کن (بعد از Product)
from products.models import Product
from accounts.models import Customer
from django.core.validators import MaxValueValidator, MinValueValidator


class Comment(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    content = models.CharField(max_length=1000)
    reply = models.CharField(max_length=1000, blank=True)  # پاسخ ادمین
    is_confirmed = models.BooleanField(default=False)  # تأیید توسط ادمین

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "product"],
                name="unique_comment_per_customer_product",
            )
        ]
        indexes = [models.Index(fields=["product", "is_confirmed"])]

    def __str__(self):
        return f"{self.customer_id} -> {self.product_id} ({self.rating})"