from django.urls import path

from apps.notifications.views import (
    NotificationListAPIView,
    NotificationMarkAllReadAPIView,
    NotificationMarkReadAPIView,
)

urlpatterns = [
    path("notifications/", NotificationListAPIView.as_view(), name="member-notifications-list"),
    path("notifications/mark-read/", NotificationMarkReadAPIView.as_view(), name="member-notifications-mark-read"),
    path("notifications/mark-all-read/", NotificationMarkAllReadAPIView.as_view(), name="member-notifications-mark-all-read"),
]

