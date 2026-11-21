from django.db import models

# Create your models here.
# blog/models.py

import math

from django.db import models
from django.utils import timezone
from django.utils.html import strip_tags
from django.utils.text import slugify


def unique_slugify(instance, value, max_length=200):
    """از value یک slug یکتا می‌سازد (فارسی هم پشتیبانی می‌شود)."""
    model = instance.__class__
    base = slugify(value, allow_unicode=True)[: max_length - 10] or model.__name__.lower()
    slug, n = base, 2
    while model.objects.exclude(pk=instance.pk).filter(slug=slug).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, allow_unicode=True, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.name, max_length=60)
        super().save(*args, **kwargs)


class BlogPost(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True, blank=True)
    summary = models.CharField(max_length=500)
    content = models.TextField()

    image = models.ImageField(upload_to="blog/", blank=True, null=True)
    image_alt = models.CharField(max_length=150, blank=True)  # متن جایگزین تصویر (سئو و دسترسی‌پذیری)

    # سئو
    seo_title = models.CharField(max_length=70, blank=True)  # اگر خالی باشد، عنوان مقاله استفاده می‌شود
    meta_description = models.CharField(max_length=160, blank=True)

    tags = models.ManyToManyField(Tag, related_name="posts", blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True
    )
    # تاریخ انتشار؛ اگر در آینده باشد مقاله تا آن زمان نمایش داده نمی‌شود (انتشار زمان‌بندی‌شده)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    author_name = models.CharField(max_length=100, blank=True)  # فقط یک نام متنی

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "published_at"])]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=200)
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def reading_time(self) -> int:
        """زمان تقریبی مطالعه (دقیقه)، با سرعت ۲۰۰ کلمه در دقیقه."""
        words = len(strip_tags(self.content).split())
        return max(1, math.ceil(words / 200))