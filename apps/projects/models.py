from django.conf import settings
from django.db import models

from apps.common.models import TenantScopedModel, TimeStampedModel, UUIDModel


class Project(UUIDModel, TimeStampedModel, TenantScopedModel):
    class Status(models.TextChoices):
        ONGOING = "ongoing", "Ongoing"
        STOPPED = "stopped", "Stopped"
        COMPLETED = "completed", "Completed"

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366F1")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ONGOING)
    completion_percent = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="projects_created")

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "id"]),
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["tenant", "created_by"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(completion_percent__gte=0) & models.Q(completion_percent__lte=100),
                name="projects_project_completion_percent_0_100",
            ),
        ]

    def __str__(self):
        return self.name


class ProjectMember(UUIDModel, TimeStampedModel):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="project_memberships")
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="project_members_added",
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ("project", "user")
        indexes = [
            models.Index(fields=["tenant", "project"]),
            models.Index(fields=["tenant", "user"]),
        ]
