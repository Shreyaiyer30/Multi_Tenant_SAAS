from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.common.models import TenantScopedModel, TimeStampedModel, UUIDModel


class Task(UUIDModel, TimeStampedModel, TenantScopedModel):
    class Status(models.TextChoices):
        TODO = "todo", "Todo"
        IN_PROGRESS = "in_progress", "In Progress"
        IN_REVIEW = "in_review", "In Review"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        URGENT = "urgent", "Urgent"

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="tasks_created")
    assignee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks_assigned")
    progress_percent = models.PositiveIntegerField(default=0)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["status", "position", "created_at"]
        indexes = [
            models.Index(fields=["tenant", "id"]),
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "priority"]),
            models.Index(fields=["tenant", "assignee", "status"]),
            models.Index(fields=["tenant", "due_date"]),
            models.Index(fields=["tenant", "project", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(progress_percent__gte=0) & models.Q(progress_percent__lte=100),
                name="tasks_task_progress_percent_0_100",
            ),
        ]

    @property
    def is_overdue(self):
        return bool(self.due_date and self.due_date < timezone.localdate() and self.status != self.Status.DONE)


class Comment(UUIDModel, TimeStampedModel, TenantScopedModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()
    edited = models.BooleanField(default=False)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["tenant", "id"])]


class ActivityEvent(UUIDModel):
    class EventType(models.TextChoices):
        TASK_CREATED = "task_created", "Task Created"
        TITLE_CHANGED = "title_changed", "Title Changed"
        DESCRIPTION_CHANGED = "description_changed", "Description Changed"
        STATUS_CHANGED = "status_changed", "Status Changed"
        PRIORITY_CHANGED = "priority_changed", "Priority Changed"
        ASSIGNEE_CHANGED = "assignee_changed", "Assignee Changed"
        DUE_DATE_CHANGED = "due_date_changed", "Due Date Changed"
        COMMENT_ADDED = "comment_added", "Comment Added"
        COMMENT_DELETED = "comment_deleted", "Comment Deleted"

    id = models.UUIDField(primary_key=True)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="activity_events")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activity")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_events")
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "created_at"])]


class Notification(UUIDModel):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="notifications", null=True, blank=True)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="triggered_notifications")
    type = models.CharField(max_length=64, default="generic")
    event_type = models.CharField(max_length=64)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    body = models.CharField(max_length=500)
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "recipient", "read_at", "created_at"])]


class TaskActivity(UUIDModel):
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="task_activities")
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activity_log")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="task_activities")
    event_type = models.CharField(max_length=64)
    old_values = models.JSONField(default=dict, blank=True)
    new_values = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "task", "created_at"])]
