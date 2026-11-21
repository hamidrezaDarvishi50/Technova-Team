# blog/urls.py

from django.urls import path

from . import views

urlpatterns = [
    # عمومی
    path("posts/", views.BlogPostListView.as_view(), name="blog-post-list"),
    path("posts/<str:slug>/", views.BlogPostDetailView.as_view(), name="blog-post-detail"),
    path("tags/", views.BlogTagListView.as_view(), name="blog-tag-list"),
    # مدیریت
    path("manage/posts/", views.BlogPostManageListView.as_view(), name="blog-manage-list"),
    path("manage/posts/<int:pk>/", views.BlogPostManageDetailView.as_view(), name="blog-manage-detail"),
]