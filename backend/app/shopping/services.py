from finance.models import DiscountCode  # اگر اسم اپ تخفیف فرق دارد عوض کن
from django.db import transaction, IntegrityError
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from products.models import Product
from rest_framework.exceptions import ValidationError

from .models import Cart, Order, OrderItem, ShopSettings
from accounts.models import Customer
from rest_framework.exceptions import APIException


class PendingOrderExists(APIException):
    status_code = 409
    default_detail = "شما یک سفارش در انتظار پرداخت دارید."
    default_code = "pending_order_exists"
    

S = Order.Status

# وضعیت‌های مجاز بعدی برای هر وضعیت
ALLOWED_TRANSITIONS = {
    S.PENDING.value: {S.PAID.value, S.CANCELLED.value},
    S.PAID.value: {S.SHIPPED.value, S.CANCELLED.value},
    S.SHIPPED.value: {S.COMPLETED.value},
    S.COMPLETED.value: set(),
    S.CANCELLED.value: set(),
}


# --------------------------------------------------------------------------
# سبد خرید
# --------------------------------------------------------------------------
def get_cart(customer) -> Cart:
    Cart.objects.get_or_create(customer=customer)
    return Cart.objects.prefetch_related("items__product").get(customer=customer)


# --------------------------------------------------------------------------
# محاسبه‌ی مبلغ‌ها
# --------------------------------------------------------------------------
def find_discount_code(raw, customer_id):
    code = (raw or "").strip()
    if not code:
        return None

    discount = DiscountCode.objects.filter(code__iexact=code).first()
    if discount is None:
        raise ValidationError({"discount_code": "کد تخفیف معتبر نیست."})
    if discount.expires_at <= timezone.now():
        raise ValidationError({"discount_code": "کد تخفیف منقضی شده است."})
    if discount.used_count >= discount.quantity:
        raise ValidationError({"discount_code": "ظرفیت استفاده از این کد تمام شده است."})

    already_used = (
        Order.objects.filter(customer_id=customer_id, discount_code=discount)
        .exclude(status=S.CANCELLED.value)
        .exists()
    )
    if already_used:
        raise ValidationError({"discount_code": "شما قبلاً از این کد تخفیف استفاده کرده‌اید."})
    return discount


def compute_discount_amount(discount, items_price: int) -> int:
    if discount is None:
        return 0
    if discount.type == DiscountCode.DiscountType.PERCENTAGE:
        amount = items_price * discount.amount // 100
    else:
        amount = discount.amount
    return min(amount, items_price)  # تخفیف از مبلغ کالاها بیشتر نشود


def validate_cart(cart: Cart):
    items = list(cart.items.all())
    if not items:
        raise ValidationError({"cart": "سبد خرید خالی است."})

    problems = [
        f"«{item.product.name}» (موجودی: {item.product.stock})"
        for item in items
        if item.quantity > item.product.stock
    ]
    if problems:
        raise ValidationError({"cart": "موجودی کافی نیست: " + "، ".join(problems)})
    return items


def calculate_totals(cart: Cart, code_raw=None) -> dict:
    items = validate_cart(cart)
    items_price = sum(item.line_total for item in items)
    discount = find_discount_code(code_raw, cart.customer_id)
    discount_amount = compute_discount_amount(discount, items_price)
    shipping_price = ShopSettings.load().shipping_price

    return {
        "items": items,
        "discount": discount,
        "items_price": items_price,
        "discount_amount": discount_amount,
        "shipping_price": shipping_price,
        "total_price": items_price - discount_amount + shipping_price,
    }


# --------------------------------------------------------------------------
# ثبت سفارش
# --------------------------------------------------------------------------
@transaction.atomic
def create_order(customer, address, code_raw=None) -> Order:
    # قفل ردیف مشتری: دو درخواست هم‌زمان یک مشتری پشت سر هم اجرا می‌شن
    Customer.objects.select_for_update().get(pk=customer.pk)

    pending_id = (
        Order.objects.filter(customer=customer, status=S.PENDING.value)
        .values_list("id", flat=True)
        .first()
    )
    if pending_id is not None:
        raise PendingOrderExists(
            {
                "detail": "شما یک سفارش در انتظار پرداخت دارید. ابتدا آن را پرداخت یا لغو کنید.",
                "pending_order_id": pending_id,
            }
        )

    cart = get_cart(customer)
    totals = calculate_totals(cart, code_raw)
    discount = totals["discount"]

    if discount is not None:
        # رزرو ظرفیت کد به‌صورت اتمیک (در درخواست‌های هم‌زمان بیشتر از ظرفیت مصرف نشود)
        reserved = DiscountCode.objects.filter(
            pk=discount.pk, used_count__lt=F("quantity")
        ).update(used_count=F("used_count") + 1)
        if not reserved:
            raise ValidationError({"discount_code": "ظرفیت استفاده از این کد تمام شده است."})

    try:
        with transaction.atomic():  # savepoint برای گرفتن خطای constraint
            order = Order.objects.create(
                customer=customer,
                address=address,
                shipping_address=address.address,
                shipping_postal_code=address.postal_code,
                discount_code=discount,
                discount_amount=totals["discount_amount"],
                shipping_price=totals["shipping_price"],
                items_price=totals["items_price"],
                total_price=totals["total_price"],
            )
    except IntegrityError:
        if discount is None:
            raise
        raise ValidationError(
            {"discount_code": "شما قبلاً از این کد تخفیف استفاده کرده‌اید."}
        )

    OrderItem.objects.bulk_create(
        [
            OrderItem(
                order=order,
                product=item.product,
                product_name=item.product.name,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            for item in totals["items"]
        ]
    )
    cart.items.all().delete()
    return order


# --------------------------------------------------------------------------
# لغو و تغییر وضعیت
# --------------------------------------------------------------------------
def _cancel(order: Order) -> Order:
    if order.discount_code_id:
        # ظرفیت کد تخفیف برگردد
        DiscountCode.objects.filter(
            pk=order.discount_code_id, used_count__gt=0
        ).update(used_count=F("used_count") - 1)

    order.status = S.CANCELLED.value
    order.cancelled_at = timezone.now()
    order.save(update_fields=["status", "cancelled_at", "updated_at"])
    return order


def _deduct_stock(order: Order) -> None:
    """کم کردن موجودی و افزودن به فروش، فقط موقع completed."""
    items = list(order.items.all())
    product_ids = sorted(item.product_id for item in items)

    # قفل به ترتیب id تا بین دو درخواست هم‌زمان deadlock پیش نیاید
    locked = {
        p.pk: p
        for p in Product.objects.select_for_update().filter(pk__in=product_ids).order_by("pk")
    }
    for item in items:
        product = locked[item.product_id]
        if product.stock < item.quantity:
            raise ValidationError(
                {
                    "status": (
                        f"موجودی «{product.name}» کافی نیست "
                        f"(موجودی: {product.stock}، سفارش: {item.quantity})."
                    )
                }
            )

    for item in items:
        Product.objects.filter(pk=item.product_id).update(
            stock=F("stock") - item.quantity,
            sold_count=F("sold_count") + item.quantity,
        )


@transaction.atomic
def customer_cancel(order_id: int, customer) -> Order:
    order = get_object_or_404(
        Order.objects.select_for_update().filter(customer=customer), pk=order_id
    )
    if order.status != S.PENDING.value:
        raise ValidationError({"status": "فقط سفارش‌های در انتظار پرداخت قابل لغو هستند."})
    return _cancel(order)


@transaction.atomic
def change_status(order_id: int, new_status: str) -> Order:
    order = get_object_or_404(Order.objects.select_for_update(), pk=order_id)

    if new_status == order.status:
        return order
    if new_status not in ALLOWED_TRANSITIONS[order.status]:
        raise ValidationError(
            {"status": f"تغییر وضعیت از «{order.status}» به «{new_status}» مجاز نیست."}
        )

    if new_status == S.CANCELLED.value:
        return _cancel(order)
    if new_status == S.PAID.value:
        order.paid_at = timezone.now()
    elif new_status == S.COMPLETED.value:
        _deduct_stock(order)

    order.status = new_status
    order.save(update_fields=["status", "paid_at", "updated_at"])
    return order


@transaction.atomic
def expire_order(order_id: int) -> bool:
    """سفارش pending را لغو می‌کند؛ اگر در این فاصله وضعیتش عوض شده باشد کاری نمی‌کند."""
    order = Order.objects.select_for_update().filter(
        pk=order_id, status=S.PENDING.value
    ).first()
    if order is None:
        return False
    _cancel(order)  # ظرفیت کد تخفیف هم برمی‌گردد
    return True