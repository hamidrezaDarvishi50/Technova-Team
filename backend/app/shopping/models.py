from django.db import models

# Create your models here.
from django.core.validators import MinValueValidator
from django.db import models


# --------------------------------------------------------------------------
# سبد خرید (قیمت‌ها زنده از خود محصول محاسبه می‌شوند)
# --------------------------------------------------------------------------
class Cart(models.Model):
    customer = models.OneToOneField(
        "accounts.Customer",
        on_delete=models.CASCADE,
        related_name="cart",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart({self.customer_id})"

    @property
    def total_price(self) -> int:
        items = self.items.select_related("product")
        return sum(item.line_total for item in items)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(
        default=1, validators=[MinValueValidator(1)]
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cart", "product"], name="unique_product_per_cart"
            )
        ]

    def __str__(self):
        return f"{self.product_id} x {self.quantity}"

    @property
    def unit_price(self) -> int:
        return self.product.final_price  # قیمت فعلی بعد از تخفیف محصول

    @property
    def line_total(self) -> int:
        return self.unit_price * self.quantity


# --------------------------------------------------------------------------
# سفارش (همه‌ی مبلغ‌ها و قیمت‌ها در لحظه‌ی ثبت، ثابت ذخیره می‌شوند)
# --------------------------------------------------------------------------
class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        SHIPPED = "shipped", "Shipped"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(
        "accounts.Customer",
        on_delete=models.PROTECT,  # سابقه‌ی مالی با حذف مشتری از بین نرود
        related_name="orders",
    )

    # آدرس: هم FK (برای ارجاع) و هم کپی متن آدرس (تا با ویرایش/حذف آدرس، سفارش عوض نشود)
    address = models.ForeignKey(
        "accounts.Address",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    shipping_address = models.CharField(max_length=255)
    shipping_postal_code = models.CharField(max_length=10)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True
    )

    discount_code = models.ForeignKey(
        "discounts.DiscountCode",  # اگر اسم اپ تخفیف فرق دارد، اینجا عوض کن
        on_delete=models.PROTECT,  # کد استفاده‌شده در سفارش حذف نشود
        null=True,
        blank=True,
        related_name="orders",
    )
    discount_amount = models.PositiveIntegerField(default=0)
    shipping_price = models.PositiveIntegerField(default=0)
    items_price = models.PositiveIntegerField()
    total_price = models.PositiveIntegerField()  # items_price - discount_amount + shipping_price

    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["customer", "status"])]

    def __str__(self):
        return f"Order #{self.pk} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,  # محصولِ سفارش‌داده‌شده حذف نشود (۴۰۹ در API محصول)
        related_name="order_items",
    )
    product_name = models.CharField(max_length=100)  # کپی نام در لحظه‌ی خرید
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.PositiveIntegerField()  # قیمت نهایی (بعد از تخفیف محصول) در لحظه‌ی خرید

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    @property
    def line_total(self) -> int:
        return self.unit_price * self.quantity