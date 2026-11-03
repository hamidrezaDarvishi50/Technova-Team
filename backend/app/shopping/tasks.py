import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from . import services
from .models import Order

logger = logging.getLogger(__name__)


@shared_task
def cancel_expired_orders() -> int:
    timeout = getattr(settings, "ORDER_PAYMENT_TIMEOUT_MINUTES", 1440)
    deadline = timezone.now() - timedelta(minutes=timeout)

    order_ids = list(
        Order.objects.filter(
            status=Order.Status.PENDING, created_at__lte=deadline
        ).values_list("id", flat=True)
    )
    cancelled = 0
    for order_id in order_ids:
        try:
            cancelled += services.expire_order(order_id)
        except Exception:
            logger.exception("Failed to expire order %s", order_id)
    return cancelled