from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.tasks.models import ActivityEvent, Task
from apps.tenants.models import Membership, SubscriptionPlan, Tenant, WorkspaceSubscription

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
        base_slug = slugify(name)
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
