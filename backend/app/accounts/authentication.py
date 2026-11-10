from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.settings import api_settings
from .models import User, Customer

ACTOR_USER = "user"
ACTOR_CUSTOMER = "customer"

def tokens_for_user(user) -> dict:
    refresh = RefreshToken.for_user(user)
    refresh["actor"] = ACTOR_USER
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def tokens_for_customer(customer: Customer) -> dict:
    refresh = RefreshToken()
    refresh["customer_id"] = customer.pk
    refresh["actor"] = ACTOR_CUSTOMER
    # claim ها موقع refresh به access هم کپی می‌شوند
    return {"refresh": str(refresh), "access": str(refresh.access_token)}

class UserJWTAuthentication(JWTAuthentication):
    """فقط توکن‌های کارمندان (User) را قبول می‌کند."""

    def get_user(self, validated_token):
        if validated_token.get("actor") != ACTOR_USER:
            raise InvalidToken("این توکن مربوط به پنل نیست.")

        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("توکن شناسه‌ی کاربر ندارد.")

        user = (
            User.objects.select_related("role", "access")
            .filter(**{api_settings.USER_ID_FIELD: user_id})
            .first()
        )
        if user is None:
            raise AuthenticationFailed("کاربر یافت نشد.", code="user_not_found")
        if not user.is_active:
            raise AuthenticationFailed("حساب کاربری غیرفعال است.", code="user_inactive")
        return user

class CustomerJWTAuthentication(JWTAuthentication):
    """فقط توکن‌های مشتری (Customer) را قبول می‌کند."""

    def get_user(self, validated_token):
        if validated_token.get("actor") != ACTOR_CUSTOMER:
            raise InvalidToken("این توکن مربوط به مشتری نیست.")

        customer = Customer.objects.filter(
            pk=validated_token.get("customer_id"), is_active=True
        ).first()
        if customer is None:
            raise AuthenticationFailed("حساب کاربری یافت نشد یا غیرفعال است.")
        return customer
