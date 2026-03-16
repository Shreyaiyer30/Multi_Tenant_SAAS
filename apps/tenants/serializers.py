from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from apps.tenants.models import BillingWebhookEvent, Membership, SubscriptionPlan, Tenant, WorkspaceInvite, WorkspaceSubscription

User = get_user_model()


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ("id", "name", "slug", "plan", "is_active", "max_users", "max_projects", "created_at", "updated_at")
        read_only_fields = ("id", "plan", "is_active", "max_users", "max_projects", "created_at", "updated_at")


class TenantCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)

    @transaction.atomic
    def create(self, validated_data):
        name = validated_data["name"]
        base_slug = slugify(name) or "workspace"
        slug = base_slug
        counter = 1
        while Tenant.objects.filter(slug=slug).exists():
            counter += 1
            slug = f"{base_slug}-{counter}"

        tenant = Tenant.objects.create(name=name, slug=slug)
        Membership.objects.create(tenant=tenant, user=self.context["request"].user, role=Membership.Role.OWNER)
        return tenant


class MembershipSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ("id", "user", "role", "joined_at")
        read_only_fields = ("id", "joined_at")

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "email": obj.user.email,
            "display_name": obj.user.display_name,
            "avatar_url": obj.user.avatar_url,
        }


class MembershipInviteSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices, default=Membership.Role.MEMBER)

    def validate_email(self, value):
        try:
            user = User.objects.get(email__iexact=value)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("User not found.") from exc
        self.context["invitee"] = user
        return value

    def create(self, validated_data):
        tenant = self.context["request"].tenant
        invitee = self.context["invitee"]
        if Membership.objects.filter(tenant=tenant, user=invitee).exists():
            raise serializers.ValidationError({"email": ["User is already a member."]})

        return Membership.objects.create(
            tenant=tenant,
            user=invitee,
            role=validated_data["role"],
            invited_by=self.context["request"].user,
        )


class MembershipRoleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Membership
        fields = ("role",)


class WorkspaceDashboardSerializer(serializers.Serializer):
    overview = serializers.DictField()
    tasks_by_status = serializers.DictField()
    tasks_by_priority = serializers.DictField()
    recent_activity = serializers.ListField()
    members_summary = serializers.ListField()
    projects_summary = serializers.ListField()


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ("id", "name", "code", "price", "max_projects", "max_users", "is_active")


class WorkspaceSubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = WorkspaceSubscription
        fields = (
            "id",
            "workspace",
            "plan",
            "razorpay_order_id",
            "is_active",
            "start_date",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class WorkspaceInviteSerializer(serializers.ModelSerializer):
    workspace = serializers.SerializerMethodField()
    invite_link = serializers.SerializerMethodField()

    class Meta:
        model = WorkspaceInvite
        fields = (
            "id",
            "workspace",
            "email",
            "role",
            "token",
            "invite_link",
            "expires_at",
            "accepted_at",
            "revoked_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_workspace(self, obj):
        return {"id": obj.tenant_id, "slug": obj.tenant.slug, "name": obj.tenant.name}

    def get_invite_link(self, obj):
        return f"/invite/{obj.token}"


class WorkspaceInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.Role.choices, default=Membership.Role.MEMBER)
    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=30, default=7)

    def create(self, validated_data):
        request = self.context["request"]
        tenant = request.tenant
        email = validated_data["email"].lower().strip()
        role = validated_data["role"]
        expires_in_days = validated_data["expires_in_days"]

        active_invite = WorkspaceInvite.objects.filter(
            tenant=tenant,
            email__iexact=email,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).first()
        if active_invite:
            return active_invite

        return WorkspaceInvite.objects.create(
            tenant=tenant,
            email=email,
            role=role,
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=expires_in_days),
        )


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate_token(self, value):
        invite = WorkspaceInvite.objects.select_related("tenant").filter(token=value).first()
        if not invite:
            raise serializers.ValidationError("Invite not found.")
        if invite.accepted_at is not None:
            raise serializers.ValidationError("Invite already used.")
        if invite.revoked_at is not None:
            raise serializers.ValidationError("Invite has been revoked.")
        if invite.expires_at <= timezone.now():
            raise serializers.ValidationError("Invite has expired.")
        self.context["invite"] = invite
        return value

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        invite = self.context["invite"]
        if request.user.email.lower() != invite.email.lower():
            raise serializers.ValidationError({"token": ["Invite email does not match the logged-in user."]})

        membership, _ = Membership.objects.get_or_create(
            tenant=invite.tenant,
            user=request.user,
            defaults={"role": invite.role, "invited_by": invite.invited_by},
        )
        if membership.role != invite.role:
            membership.role = invite.role
            membership.save(update_fields=["role"])

        invite.accepted_at = timezone.now()
        invite.save(update_fields=["accepted_at", "updated_at"])
        return membership


class InviteTokenPreviewSerializer(serializers.Serializer):
    token = serializers.CharField()

    def validate_token(self, value):
        invite = WorkspaceInvite.objects.select_related("tenant").filter(token=value).first()
        if not invite:
            raise serializers.ValidationError("Invite not found.")
        self.context["invite"] = invite
        return value


class BillingWebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingWebhookEvent
        fields = ("id", "event_id", "event_type", "status", "workspace", "subscription", "processed_at", "created_at", "updated_at")
        read_only_fields = fields
