from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class ProductPagination(PageNumberPagination):
    page_size = 3  # پیش‌فرض (مناسب گرید ۳ یا ۴ ستونه)
    page_size_query_param = "page_size"
    max_page_size = 48

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "page": self.page.number,
                "page_size": self.page.paginator.per_page,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )