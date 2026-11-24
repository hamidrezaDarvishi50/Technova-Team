from django.urls import path

from .views import *

urlpatterns = [
    path("", TaskListCreateView.as_view(), name="task-list"),
    path("types/", TaskTypeListCreateView.as_view(), name="task-type-list"),
    path("types/<int:pk>/", TaskTypeDetailView.as_view(), name="task-type-detail"),
    path("<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
]
