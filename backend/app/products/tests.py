from django.test import TestCase

# Create your tests here.
# تغییرات صفحه‌بندی محصولات

# ==========================================================================
# ۱) products/serializers.py  (فقط برای مستندات swagger)
# ==========================================================================
class PaginatedProductListSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    total_pages = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    next = serializers.CharField(allow_null=True)
    previous = serializers.CharField(allow_null=True)
    results = ProductListSerializer(many=True)


# ==========================================================================
# ۲) products/views.py
# ==========================================================================

PAGE_PARAMS = [
    OpenApiParameter("page", int, description="شماره‌ی صفحه (از ۱)"),
    OpenApiParameter("page_size", int, description="تعداد در صفحه (پیش‌فرض ۱۲، حداکثر ۴۸)"),
]


def paginate(view, request, queryset):
    paginator = ProductPagination()
    page = paginator.paginate_queryset(queryset, request, view=view)
    data = ProductListSerializer(page, many=True, context={"request": request}).data
    return paginator.get_paginated_response(data)


# --- متد get در ProductListCreateView را با این جایگزین کن ---
#
#    @extend_schema(
#        tags=PRODUCT_TAG,
#        summary="لیست محصولات (با مرتب‌سازی، فیلتر و صفحه‌بندی)",
#        description=(
#            "بدون پارامتر، همه‌ی محصولات از جدیدترین نمایش داده می‌شوند. "
#            "فیلتر قیمت روی قیمت نهایی (بعد از تخفیف) اعمال می‌شود."
#        ),
#        parameters=[ProductFilterSerializer, *PAGE_PARAMS],
#        responses={
#            200: PaginatedProductListSerializer,
#            400: OpenApiResponse(description="پارامتر نامعتبر"),
#            404: OpenApiResponse(description="شماره‌ی صفحه نامعتبر"),
#        },
#    )
#    def get(self, request):
#        filters = ProductFilterSerializer(data=request.query_params)
#        filters.is_valid(raise_exception=True)
#
#        queryset = apply_filters(products_queryset(), filters.validated_data)
#        return paginate(self, request, queryset)


# --- متد get در ProductDiscountedListView را با این جایگزین کن ---
#
#    @extend_schema(
#        tags=PRODUCT_TAG,
#        summary="محصولات تخفیف‌دار (بیشترین تخفیف اول، با صفحه‌بندی)",
#        parameters=PAGE_PARAMS,
#        responses={200: PaginatedProductListSerializer},
#    )
#    def get(self, request):
#        queryset = products_queryset().filter(discount__gt=0).order_by(
#            "-discount", "-created_at", "-id"
#        )
#        return paginate(self, request, queryset)