from django.conf import settings
from django.db import models

from apps.common.models import TimeStampedModel, UUIDModel


class Tenant(UUIDModel, TimeStampedModel):
    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.FREE)
    max_users = models.PositiveIntegerField(default=3)
    max_projects = models.PositiveIntegerField(default=5)

    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    subscription_status = models.CharField(max_length=64, blank=True, null=True)
    current_period_end = models.DateTimeField(blank=True, null=True)
    cancel_at_period_end = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.slug


class Membership(UUIDModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sent_workspace_invites",
        null=True,
        blank=True,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("tenant", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user_id}:{self.tenant_id}:{self.role}"
