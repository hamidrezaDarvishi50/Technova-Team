# این مسیرها را به urlpatterns فایل urls.py اپ products اضافه کن
# (قبل از مسیر آخرِ  "<str:slug>/" )

    # نظرات مشتری
from django.urls import path
from .views import *

urlpatterns = [    
    path("my/", MyCommentListView.as_view(), name="comment-my-list"),
    path("my/<int:pk>/", MyCommentDetailView.as_view(), name="comment-my-detail"),
    # مدیریت نظرات (ادمین)
    path("manage/", CommentManageListView.as_view(), name="comment-manage-list"),
    path("manage/<int:pk>/", CommentManageDetailView.as_view(), name="comment-manage-detail"),
    # نظرات یک محصول (عمومی / ثبت توسط مشتری)
    path("product/<str:slug>/", ProductCommentListCreateView.as_view(), name="product-comments"),
]