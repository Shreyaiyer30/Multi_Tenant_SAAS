from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel, UUIDModel


class AuditLog(UUIDModel, TimeStampedModel):
    class Action(models.TextChoices):
        PROJECT_CREATED = "PROJECT_CREATED", "Project Created"
        PROJECT_UPDATED = "PROJECT_UPDATED", "Project Updated"
        PROJECT_DELETED = "PROJECT_DELETED", "Project Deleted"
        PROJECT_MEMBER_ADDED = "PROJECT_MEMBER_ADDED", "Project Member Added"
        PROJECT_MEMBER_REMOVED = "PROJECT_MEMBER_REMOVED", "Project Member Removed"
        TASK_CREATED = "TASK_CREATED", "Task Created"
        TASK_UPDATED = "TASK_UPDATED", "Task Updated"
        TASK_DELETED = "TASK_DELETED", "Task Deleted"
        TASK_ASSIGNED = "TASK_ASSIGNED", "Task Assigned"
        TASK_UNASSIGNED = "TASK_UNASSIGNED", "Task Unassigned"
        TASK_STATUS_CHANGED = "TASK_STATUS_CHANGED", "Task Status Changed"

    workspace = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="audit_logs")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=64, choices=Action.choices)
    entity_type = models.CharField(max_length=64, default="task")
    entity_id = models.CharField(max_length=64, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "created_at"]),
            models.Index(fields=["workspace", "action"]),
            models.Index(fields=["workspace", "entity_type", "created_at"]),
        ]
