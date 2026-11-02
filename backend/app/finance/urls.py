from django.urls import path
from .views import DiscountCodeListView, DiscountCodeDetailView

urlpatterns = [    
    path("discount-code/", DiscountCodeListView.as_view(), name="discount-codes"),
    path("discount-code/<int:pk>/", DiscountCodeDetailView.as_view())
]
