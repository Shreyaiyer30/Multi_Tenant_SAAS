from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel, UUIDModel


class Notification(UUIDModel, TimeStampedModel):
    workspace = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="member_notifications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="member_notifications")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triggered_member_notifications",
    )
    type = models.CharField(max_length=64)
    message = models.TextField()
    payload = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "user", "is_read", "created_at"]),
            models.Index(fields=["workspace", "created_at"]),
        ]

