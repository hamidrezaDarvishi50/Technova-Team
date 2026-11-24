# tasks/tasks.py  (Celery)

from celery import shared_task

from .services import generate_due_occurrences


@shared_task(name="tasks.generate_periodic_tasks")
def generate_periodic_tasks():
    return generate_due_occurrences()
