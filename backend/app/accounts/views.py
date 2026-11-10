from django.shortcuts import render

# Create your views here.
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from django.conf import settings

from django.db import transaction
from django.db.models import ProtectedError, Count
from django.shortcuts import get_object_or_404
from .authentication import (
    ACTOR_CUSTOMER,
    ACTOR_USER,
    CustomerJWTAuthentication,
    tokens_for_customer,
    tokens_for_user,
)

from . import otp
from .models import Customer, User, Address, Role
from .permission import IsAdminRole, IsCustomer, IsStaffUser
from .serializers import *
from .tasks import send_otp_sms
from .authentication import CustomerJWTAuthentication, UserJWTAuthentication
from .permission import IsCustomer
from .access import ACTIONS, ORDER_STATUSES, SECTIONS


class CustomerOTPRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(
        request=PhoneSerializer,
        responses={
            200: OpenApiResponse(description="کد تایید ارسال شد.")
        },
        summary="درخواست کد تایید مشتری",
    )
    def post(self, request: Request):
        serializer = PhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        code = otp.issue_otp(phone)
        send_otp_sms.delay(phone, code)

        data = {"detail": "کد تایید ارسال شد.", "expires_in": otp.OTP_TTL}
        if settings.DEBUG:
            data["debug_code"] = code

        return Response(data)


class CustomerOTPVerifyView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp"

    @extend_schema(
        request=OTPVerifySerializer,
        responses={
            200: OpenApiResponse(description="ورود موفق مشتری"),
            201: OpenApiResponse(description="ثبت‌نام و ورود موفق مشتری"),
            403: OpenApiResponse(description="حساب کاربری غیرفعال است."),
        },
        summary="تایید کد و ورود مشتری",
    )
    def post(self, request: Request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]

        otp.verify_otp(phone, serializer.validated_data["code"])

        customer, created = Customer.objects.get_or_create(phone=phone)
        if not customer.is_active:
            return Response(
                {"detail": "حساب کاربری شما غیرفعال است."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                "tokens": tokens_for_customer(customer),
                "is_new": created,
                "profile_completed": bool(
                    customer.first_name and customer.last_name
                ),
                "customer": CustomerSerializer(customer).data,
            },
            status=(
                status.HTTP_201_CREATED
                if created
                else status.HTTP_200_OK
            ),
        )


class CustomerMeView(RetrieveUpdateAPIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes = [IsCustomer]
    serializer_class = CustomerSerializer
    http_method_names = ["get", "patch", "head", "options"]

    @extend_schema(
        responses=CustomerSerializer,
        summary="دریافت پروفایل مشتری",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    @extend_schema(
        request=CustomerSerializer,
        responses=CustomerSerializer,
        summary="ویرایش پروفایل مشتری",
    )
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    def get_object(self):
        return self.request.user


class _BaseRefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    actor = None

    def is_active(self, token) -> bool:
        raise NotImplementedError

    @extend_schema(
        request=RefreshSerializer,
        responses={
            200: OpenApiResponse(description="توکن دسترسی جدید"),
        },
        summary="دریافت توکن دسترسی جدید",
    )
    def post(self, request):
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
        except TokenError as exc:
            raise InvalidToken(exc.args[0])

        if token.get("actor") != self.actor or not self.is_active(token):
            raise InvalidToken("توکن نامعتبر است.")
        return Response({"access": str(token.access_token)})


class CustomerRefreshView(_BaseRefreshView):
    actor = ACTOR_CUSTOMER

    def is_active(self, token):
        return Customer.objects.filter(
            pk=token.get("customer_id"), is_active=True
        ).exists()



ADDRESS_TAG = ["Customer Address"]
AUTH_RESPONSES = {401: OpenApiResponse(description="احراز هویت نشده (توکن مشتری لازم است)")}

class AddressBaseView(APIView):
    """فقط مشتری لاگین‌شده؛ هر مشتری فقط آدرس‌های خودش را می‌بیند."""

    authentication_classes = [CustomerJWTAuthentication]
    permission_classes = [IsCustomer]

    def get_address(self, request, pk):
        # آدرس مشتری دیگر هم 404 می‌دهد (وجودش لو نمی‌رود)
        return get_object_or_404(Address, pk=pk, customer=request.user)


class AddressListCreateView(AddressBaseView):
    @extend_schema(
        tags=ADDRESS_TAG,
        summary="لیست آدرس‌های من",
        description="آدرس پیش‌فرض اول، بعد جدیدترین‌ها.",
        responses={200: AddressSerializer(many=True), **AUTH_RESPONSES},
    )
    def get(self, request):
        addresses = Address.objects.filter(customer=request.user).order_by(
            "-is_default", "-created_at"
        )
        return Response(AddressSerializer(addresses, many=True).data)

    @extend_schema(
        tags=ADDRESS_TAG,
        summary="افزودن آدرس",
        description="اولین آدرس خودکار پیش‌فرض می‌شود.",
        request=AddressSerializer,
        responses={
            201: AddressSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **AUTH_RESPONSES,
        },
    )
    def post(self, request):
        serializer = AddressSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AddressDetailView(AddressBaseView):
    @extend_schema(
        tags=ADDRESS_TAG,
        summary="جزئیات یک آدرس",
        responses={
            200: AddressSerializer,
            404: OpenApiResponse(description="آدرس پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def get(self, request, pk):
        address = self.get_address(request, pk)
        return Response(AddressSerializer(address).data)

    @extend_schema(
        tags=ADDRESS_TAG,
        summary="ویرایش آدرس",
        description="با is_default=true این آدرس پیش‌فرض می‌شود و بقیه از پیش‌فرض خارج می‌شوند.",
        request=AddressSerializer,
        responses={
            200: AddressSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="آدرس پیدا نشد"),
            **AUTH_RESPONSES,
        },
    )
    def patch(self, request, pk):
        address = self.get_address(request, pk)
        serializer = AddressSerializer(
            address, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @extend_schema(
        tags=ADDRESS_TAG,
        summary="حذف آدرس",
        description="اگر آدرس پیش‌فرض حذف شود، جدیدترین آدرس باقی‌مانده پیش‌فرض می‌شود.",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            404: OpenApiResponse(description="آدرس پیدا نشد"),
            409: OpenApiResponse(description="آدرس در سفارش‌ها استفاده شده و حذف نمی‌شود"),
            **AUTH_RESPONSES,
        },
    )
    def delete(self, request, pk):
        address = self.get_address(request, pk)
        was_default = address.is_default
        try:
            with transaction.atomic():
                address.delete()
                if was_default:
                    newest = (
                        Address.objects.filter(customer=request.user)
                        .order_by("-created_at")
                        .first()
                    )
                    if newest:
                        newest.is_default = True
                        newest.save(update_fields=["is_default", "updated_at"])
        except ProtectedError:
            return Response(
                {"detail": "این آدرس در سفارش‌ها استفاده شده و قابل حذف نیست."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserRefreshView(_BaseRefreshView):
    actor = ACTOR_USER

    def is_active(self, token):
        return User.objects.filter(
            pk=token.get("user_id"), is_active=True
        ).exists()


class UserLoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    @extend_schema(
        request=UserLoginSerializer,
        responses={
            200: OpenApiResponse(description="ورود موفق کاربر سازمانی"),
        },
        summary="ورود کاربر سازمانی",
    )
    def post(self, request):
        serializer = UserLoginSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        update_last_login(None, user)
        return Response(
            {
                "tokens": tokens_for_user(user),
                "user": UserSerializer(user).data,
            }
        )


class UserMeView(APIView):
    permission_classes = [IsStaffUser]

    @extend_schema(
        responses=UserSerializer,
        summary="دریافت اطلاعات کاربر سازمانی",
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)


@extend_schema_view(
    list=extend_schema(
        responses=UserSerializer(many=True),
        summary="دریافت فهرست کاربران",
    ),
    retrieve=extend_schema(
        responses=UserSerializer,
        summary="دریافت اطلاعات یک کاربر",
    ),
    create=extend_schema(
        request=UserWriteSerializer,
        responses=UserSerializer,
        summary="ایجاد کاربر",
    ),
    update=extend_schema(
        request=UserWriteSerializer,
        responses=UserSerializer,
        summary="ویرایش کامل کاربر",
    ),
    partial_update=extend_schema(
        request=UserWriteSerializer,
        responses=UserSerializer,
        summary="ویرایش بخشی از اطلاعات کاربر",
    ),
    destroy=extend_schema(
        responses={
            204: OpenApiResponse(
                description="حساب کاربر غیرفعال شد."
            )
        },
        summary="غیرفعال کردن کاربر",
    ),
)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("role", "access").order_by("-id")
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return UserSerializer
        return UserWriteSerializer

    def perform_destroy(self, instance):
        # حذف واقعی نمی‌کنیم؛ فقط غیرفعال می‌شود
        if instance.pk == self.request.user.pk:
            raise ValidationError("نمی‌توانید حساب خودتان را غیرفعال کنید.")
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])


ROLE_TAG = ["Role"]
ADMIN_AUTH = {
    401: OpenApiResponse(description="احراز هویت نشده"),
    403: OpenApiResponse(description="دسترسی ندارید (فقط ادمین)"),
}

def roles_queryset():
    return Role.objects.annotate(users_count=Count("users")).order_by("id")


class RoleBaseView(APIView):
    authentication_classes = [UserJWTAuthentication]
    permission_classes = [IsAdminRole]


class RoleListCreateView(RoleBaseView):
    @extend_schema(
        tags=ROLE_TAG,
        summary="لیست نقش‌ها (فقط ادمین)",
        responses={200: RoleSerializer(many=True), **ADMIN_AUTH},
    )
    def get(self, request):
        return Response(RoleSerializer(roles_queryset(), many=True).data)

    @extend_schema(
        tags=ROLE_TAG,
        summary="ساخت نقش جدید با دسترسی پیش‌فرض (فقط ادمین)",
        request=RoleSerializer,
        responses={
            201: RoleSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            **ADMIN_AUTH,
        },
    )
    def post(self, request):
        serializer = RoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role = serializer.save()
        return Response(
            RoleSerializer(roles_queryset().get(pk=role.pk)).data,
            status=status.HTTP_201_CREATED,
        )


class RoleDetailView(RoleBaseView):
    @extend_schema(
        tags=ROLE_TAG,
        summary="جزئیات نقش (فقط ادمین)",
        responses={
            200: RoleSerializer,
            404: OpenApiResponse(description="نقش پیدا نشد"),
            **ADMIN_AUTH,
        },
    )
    def get(self, request, pk):
        role = get_object_or_404(roles_queryset(), pk=pk)
        return Response(RoleSerializer(role).data)

    @extend_schema(
        tags=ROLE_TAG,
        summary="ویرایش نقش (فقط ادمین)",
        description=(
            "تغییر default_permissions فقط روی کاربرانی که از این به بعد این نقش را می‌گیرند "
            "اثر دارد، نه کاربران فعلی."
        ),
        request=RoleSerializer,
        responses={
            200: RoleSerializer,
            400: OpenApiResponse(description="داده نامعتبر"),
            404: OpenApiResponse(description="نقش پیدا نشد"),
            **ADMIN_AUTH,
        },
    )
    def patch(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        serializer = RoleSerializer(role, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RoleSerializer(roles_queryset().get(pk=pk)).data)

    @extend_schema(
        tags=ROLE_TAG,
        summary="حذف نقش (فقط ادمین)",
        responses={
            204: OpenApiResponse(description="حذف شد"),
            400: OpenApiResponse(description="نقش سیستمی قابل حذف نیست"),
            404: OpenApiResponse(description="نقش پیدا نشد"),
            409: OpenApiResponse(description="این نقش کاربر دارد"),
            **ADMIN_AUTH,
        },
    )
    def delete(self, request, pk):
        role = get_object_or_404(Role, pk=pk)
        if role.is_system:
            raise ValidationError("نقش سیستمی قابل حذف نیست.")
        try:
            role.delete()
        except ProtectedError:
            return Response(
                {"detail": "این نقش کاربر دارد. ابتدا نقش آن‌ها را تغییر دهید."},
                status=status.HTTP_409_CONFLICT,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccessSchemaView(RoleBaseView):
    @extend_schema(
        tags=ROLE_TAG,
        summary="بخش‌ها و اکشن‌های قابل‌تنظیم دسترسی (برای ساخت فرم در پنل)",
        responses={200: OpenApiResponse(description="sections، actions و order_statuses"), **ADMIN_AUTH},
    )
    def get(self, request):
        return Response(
            {"sections": SECTIONS, "actions": ACTIONS, "order_statuses": ORDER_STATUSES}
        )