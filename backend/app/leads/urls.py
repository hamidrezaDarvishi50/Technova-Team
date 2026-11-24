from django.urls import path
from .views import *

urlpatterns = [
    path("", LeadListCreateView.as_view(), name="lead-list"),
    path("<int:pk>/", LeadDetailView.as_view(), name="lead-detail"),
    path("<int:pk>/notes/", LeadNoteListCreateView.as_view(), name="lead-notes"),
]
