# blog/serializers.py

from django.db import transaction
from rest_framework import serializers

from .models import BlogPost, Tag

MAX_IMAGE_SIZE = 3 * 1024 * 1024  # 3MB
DEFAULT_AUTHOR_NAME = "تیم تکنوا"

def _author_name(post) -> str:
    return post.author_name or DEFAULT_AUTHOR_NAME

# --------------------------------------------------------------------------
# تگ‌ها
# --------------------------------------------------------------------------
class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "slug"]
        read_only_fields = fields


class TagCountSerializer(TagSerializer):
    posts_count = serializers.IntegerField(read_only=True)

    class Meta(TagSerializer.Meta):
        fields = ["name", "slug", "posts_count"]
        read_only_fields = fields


# --------------------------------------------------------------------------
# خروجی عمومی
# --------------------------------------------------------------------------
class BlogPostCardSerializer(serializers.ModelSerializer):
    """کارت مقاله در لیست‌ها."""

    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.SerializerMethodField()
    reading_time = serializers.IntegerField(read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "image",
            "image_alt",
            "tags",
            "author_name",
            "reading_time",
            "published_at",
        ]
        read_only_fields = fields

    def get_author_name(self, obj) -> str:
        return _author_name(obj)


class BlogPostDetailSerializer(BlogPostCardSerializer):
    seo_title = serializers.SerializerMethodField()

    class Meta(BlogPostCardSerializer.Meta):
        fields = BlogPostCardSerializer.Meta.fields + [
            "content",
            "seo_title",
            "meta_description",
            "updated_at",
        ]
        read_only_fields = fields

    def get_seo_title(self, obj) -> str:
        return obj.seo_title or obj.title


class PaginatedBlogPostSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = BlogPostCardSerializer(many=True)


# --------------------------------------------------------------------------
# مدیریت (نقش‌های دارای دسترسی blog)
# --------------------------------------------------------------------------
class BlogPostManageListSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = BlogPost
        fields = [
            "id",
            "title",
            "slug",
            "summary",
            "image",
            "tags",
            "status",
            "published_at",
            "author_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class BlogPostManageSerializer(BlogPostManageListSerializer):
    reading_time = serializers.IntegerField(read_only=True)

    class Meta(BlogPostManageListSerializer.Meta):
        fields = BlogPostManageListSerializer.Meta.fields + [
            "content",
            "image_alt",
            "seo_title",
            "meta_description",
            # "author",
            "reading_time",
        ]
        read_only_fields = fields


class PaginatedBlogManageSerializer(serializers.Serializer):
    """فقط برای مستندات swagger."""

    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = BlogPostManageListSerializer(many=True)


class BlogPostWriteSerializer(serializers.ModelSerializer):
    """ساخت و ویرایش مقاله؛ tags لیستی از نام تگ‌هاست و تگ جدید خودکار ساخته می‌شود."""

    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        max_length=10,
        write_only=True,
    )

    class Meta:
        model = BlogPost
        fields = [
            "title",
            "slug",
            "summary",
            "content",
            "author_name",
            "image",
            "image_alt",
            "seo_title",
            "meta_description",
            "tags",
            "status",
            "published_at",
        ]

    def validate_image(self, image):
        if image and image.size > MAX_IMAGE_SIZE:
            raise serializers.ValidationError("حجم تصویر نباید بیشتر از ۳ مگابایت باشد.")
        return image

    def validate_tags(self, value):
        seen, result = set(), []
        for raw in value:
            name = " ".join(raw.split())
            if name and name.lower() not in seen:
                seen.add(name.lower())
                result.append(name)
        return result

    @staticmethod
    def _resolve_tags(names):
        return [Tag.objects.get_or_create(name=name)[0] for name in names]

    @transaction.atomic
    def create(self, validated_data):
        tag_names = validated_data.pop("tags", None)
        post = super().create(validated_data)
        if tag_names is not None:
            post.tags.set(self._resolve_tags(tag_names))
        return post

    @transaction.atomic
    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)
        # اگر تصویر عوض شد، فایل قدیمی روی دیسک نماند
        old_name = instance.image.name if "image" in validated_data and instance.image else None

        instance = super().update(instance, validated_data)

        new_name = instance.image.name if instance.image else None
        if old_name and old_name != new_name:
            instance.image.storage.delete(old_name)
        if tag_names is not None:
            instance.tags.set(self._resolve_tags(tag_names))
        return instance


# --------------------------------------------------------------------------
# query params
# --------------------------------------------------------------------------
class BlogFilterSerializer(serializers.Serializer):
    tag = serializers.SlugField(required=False, allow_unicode=True, help_text="slug تگ")
    search = serializers.CharField(
        required=False, allow_blank=True, max_length=100, help_text="جستجو در عنوان و خلاصه"
    )


class BlogManageFilterSerializer(BlogFilterSerializer):
    status = serializers.ChoiceField(choices=BlogPost.Status.choices, required=False)