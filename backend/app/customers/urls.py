from django.urls import path
from .views import *

urlpatterns = [
    path("", CustomerListView.as_view(), name="customer-list"),
    path("<int:pk>/", CustomerDetailView.as_view(), name="customer-detail"),
    path("<int:pk>/orders/", CustomerOrderListView.as_view(), name="customer-orders"),
]
