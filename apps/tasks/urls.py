from rest_framework.routers import DefaultRouter
from django.urls import path

from apps.tasks.views import NotificationDetailAPIView, NotificationListAPIView, NotificationMarkAPIView, TaskViewSet

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = router.urls + [
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/<uuid:notification_id>/", NotificationDetailAPIView.as_view(), name="notifications-detail"),
    path("notifications/read/", NotificationMarkAPIView.as_view(), {"mode": "read"}, name="notifications-read"),
    path("notifications/unread/", NotificationMarkAPIView.as_view(), {"mode": "unread"}, name="notifications-unread"),
]
