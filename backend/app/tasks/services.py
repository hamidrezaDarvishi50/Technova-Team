# tasks/services.py

import calendar
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Task

MAX_OCCURRENCES_PER_RUN = 31  # سقف برای هر وظیفه در هر اجرا (جلوگیری از سیل بعد از خاموشی طولانی)


def add_period(dt, repeat, n):
    """dt را به اندازه‌ی n دوره جلو می‌برد (ماه و سال میلادی؛ روز ماه در صورت نیاز کوتاه می‌شود)."""
    local = timezone.localtime(dt)
    if repeat == Task.Repeat.DAILY:
        return local + timedelta(days=n)
    if repeat == Task.Repeat.WEEKLY:
        return local + timedelta(weeks=n)
    if repeat == Task.Repeat.MONTHLY:
        years, month0 = divmod(local.month - 1 + n, 12)
        year, month = local.year + years, month0 + 1
    else:  # yearly
        year, month = local.year + n, local.month
    day = min(local.day, calendar.monthrange(year, month)[1])  # 31 ژانویه + 1 ماه = 28/29 فوریه
    return local.replace(year=year, month=month, day=day)


def compute_next_run(task):
    """زمان ساخت نمونه‌ی بعدی؛ None یعنی دیگر نمونه‌ای ساخته نمی‌شود."""
    if not (task.is_periodic and task.repeat_every and task.start_at):
        return None
    # از روی start_at و شمارنده محاسبه می‌شود (نه از نمونه‌ی قبلی) تا خطا جمع نشود
    nxt = add_period(task.start_at, task.repeat_every, task.generated_count + 1)
    if task.repeat_until and timezone.localtime(nxt).date() > task.repeat_until:
        return None
    return nxt


def _generate_for(pk, now):
    with transaction.atomic():
        template = (
            Task.objects.select_for_update(skip_locked=True)
            .filter(pk=pk, is_periodic=True, next_run_at__lte=now)
            .exclude(status=Task.Status.CANCELLED)
            .first()
        )
        if template is None:
            return 0  # همزمان کار دیگری انجامش داده یا شرایطش عوض شده

        assignees = list(template.assigned_to.all())
        created = 0
        while (
            template.next_run_at
            and template.next_run_at <= now
            and created < MAX_OCCURRENCES_PER_RUN
        ):
            n = template.generated_count + 1
            shift = lambda value: add_period(value, template.repeat_every, n) if value else None
            occurrence = Task.objects.create(
                subject=template.subject,
                description=template.description,
                type=template.type,
                importance=template.importance,
                status=Task.Status.TODO,
                created_by=template.created_by,
                start_at=shift(template.start_at),
                end_at=shift(template.end_at),
                deadline=shift(template.deadline),
                source=template,
            )  # فایل پیوست کپی نمی‌شود (فایل مشترک با حذف یکی از بین می‌رفت)
            occurrence.assigned_to.set(assignees)
            template.generated_count = n
            template.next_run_at = compute_next_run(template)
            created += 1

        template.save(update_fields=["generated_count", "next_run_at", "updated_at"])
        return created


def generate_due_occurrences(now=None) -> int:
    """نمونه‌های موعدرسیده‌ی وظایف تکرارشونده را می‌سازد؛ تعداد ساخته‌شده را برمی‌گرداند."""
    now = now or timezone.now()
    ids = list(
        Task.objects.filter(is_periodic=True, next_run_at__lte=now)
        .exclude(status=Task.Status.CANCELLED)
        .values_list("id", flat=True)
    )
    return sum(_generate_for(pk, now) for pk in ids)
