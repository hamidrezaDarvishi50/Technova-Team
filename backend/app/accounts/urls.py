from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("users", views.UserViewSet, basename="user")

urlpatterns = [
    # customer
    path("customer/otp/request/", views.CustomerOTPRequestView.as_view()),
    path("customer/otp/verify/", views.CustomerOTPVerifyView.as_view()),
    path("customer/token/refresh/", views.CustomerRefreshView.as_view()),
    path("customer/me/", views.CustomerMeView.as_view()),
    path("customer/addresses/", views.AddressListCreateView.as_view(), name="address-list"),
    path("customer/addresses/<int:pk>/", views.AddressDetailView.as_view(), name="address-detail"),
    
    # user
    path("user/login/", views.UserLoginView.as_view()),
    path("user/token/refresh/", views.UserRefreshView.as_view()),
    path("user/me/", views.UserMeView.as_view()),
    
    # admin
    path("", include(router.urls)),
]