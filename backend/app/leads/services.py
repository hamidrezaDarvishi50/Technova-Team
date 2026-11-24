# leads/services.py

from .models import Lead


def create_lead_from_ticket(ticket) -> Lead:
    """
    از پیام «تماس با ما» یک لید می‌سازد. subject و message وارد لید نمی‌شوند
    (لید فقط برای پیگیری مشتری است). حتماً داخل transaction.atomic صدا زده شود.
    """
    return Lead.objects.create(
        full_name=ticket.full_name,
        phone=ticket.phone,
        email=ticket.email,
        type=Lead.Type.CONTACT_FORM,
        state=Lead.State.IN_PROGRESS,
        created_at=ticket.created_at,
    )
