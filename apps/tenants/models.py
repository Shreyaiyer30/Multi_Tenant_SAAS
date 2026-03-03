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


class Department(UUIDModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=32, blank=True)

    class Meta:
        unique_together = ("tenant", "name")
        ordering = ["name"]


class DepartmentMembership(UUIDModel, TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="department_memberships")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="department_memberships")

    class Meta:
        unique_together = ("department", "user")
        indexes = [models.Index(fields=["tenant", "department"]), models.Index(fields=["tenant", "user"])]


class SubscriptionPlan(TimeStampedModel):
    class Code(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, choices=Code.choices, default=Code.PRO)
    price = models.PositiveIntegerField()  # in paise
    max_projects = models.PositiveIntegerField()
    max_users = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price", "name"]

    def __str__(self):
        return f"{self.name} ({self.price})"


class WorkspaceSubscription(TimeStampedModel):
    workspace = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True, related_name="workspace_subscriptions")
    razorpay_order_id = models.CharField(max_length=255, blank=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.workspace.slug}::{self.plan.name if self.plan else 'none'}"
