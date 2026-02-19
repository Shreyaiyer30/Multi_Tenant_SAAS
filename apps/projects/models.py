from django.conf import settings
from django.db import models

from apps.common.models import TenantScopedModel, TimeStampedModel, UUIDModel


class Project(UUIDModel, TimeStampedModel, TenantScopedModel):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#6366F1")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="projects_created")

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "id"]),
            models.Index(fields=["tenant", "created_at"]),
        ]

    def __str__(self):
        return self.name
