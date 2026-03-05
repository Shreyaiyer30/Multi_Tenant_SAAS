import secrets
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model, password_validation
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant, WorkspaceInvite

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "display_name", "avatar_url")


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    create_workspace = serializers.BooleanField(default=False)
    workspace_name = serializers.CharField(required=False, allow_blank=False)
    invite_token = serializers.CharField(required=False, allow_blank=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate(self, attrs):
        password = attrs["password"]
        email = attrs["email"]

        if not any(char.isupper() for char in password):
            raise serializers.ValidationError({"password": ["Password must include at least one uppercase letter."]})
        if not any(char.isdigit() for char in password):
            raise serializers.ValidationError({"password": ["Password must include at least one digit."]})

        dummy_user = User(email=email)
        password_validation.validate_password(password, user=dummy_user)

        invite_token = attrs.get("invite_token")
        if invite_token:
            invite = WorkspaceInvite.objects.select_related("tenant").filter(token=invite_token).first()
            if not invite:
                raise serializers.ValidationError({"invite_token": ["Invite not found."]})
            if invite.accepted_at is not None:
                raise serializers.ValidationError({"invite_token": ["Invite already used."]})
            if invite.revoked_at is not None:
                raise serializers.ValidationError({"invite_token": ["Invite has been revoked."]})
            if invite.expires_at <= timezone.now():
                raise serializers.ValidationError({"invite_token": ["Invite has expired."]})
            if invite.email.lower() != email.lower():
                raise serializers.ValidationError({"invite_token": ["Invite email does not match this account email."]})
            attrs["_invite"] = invite

        return attrs

    @staticmethod
    def _build_personal_workspace(user, requested_name=None):
        email_prefix = (user.email.split("@", 1)[0] if user.email else "workspace").strip()
        label_source = (user.first_name or email_prefix or "Workspace").strip()
        workspace_name = (requested_name or f"{label_source}'s Workspace").strip()

        base_slug = slugify(label_source) or "workspace"
        slug = f"{base_slug}-{secrets.token_hex(2)}"
        while Tenant.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{secrets.token_hex(2)}"

        workspace = Tenant.objects.create(name=workspace_name, slug=slug)
        Membership.objects.create(tenant=workspace, user=user, role=Membership.Role.OWNER)
        return workspace

    @transaction.atomic
    def create(self, validated_data):
        validated_data.pop("create_workspace", None)
        workspace_name = validated_data.pop("workspace_name", None)
        invite = validated_data.pop("_invite", None)
        validated_data.pop("invite_token", None)

        user = User.objects.create_user(**validated_data)

        # Every new account gets an isolated personal workspace by default.
        workspace = self._build_personal_workspace(user, requested_name=workspace_name)
        memberships = [workspace]

        if invite:
            Membership.objects.get_or_create(
                tenant=invite.tenant,
                user=user,
                defaults={"role": invite.role, "invited_by": invite.invited_by},
            )
            invite.accepted_at = timezone.now()
            invite.save(update_fields=["accepted_at", "updated_at"])
            memberships.append(invite.tenant)

        return {"user": user, "workspace": workspace, "workspaces": memberships}


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            username=attrs.get("email"),
            password=attrs.get("password"),
        )
        if not user:
            raise serializers.ValidationError("No active account found with the given credentials.")
        attrs["user"] = user
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            RefreshToken(value)
        except Exception as exc:
            raise serializers.ValidationError("Invalid refresh token.") from exc
        return value


class RegisterResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
    workspace = serializers.DictField(allow_null=True)
    active_workspace = serializers.CharField(allow_blank=True)
    workspaces = serializers.ListField()


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
    active_workspace = serializers.CharField(allow_blank=True)
    workspaces = serializers.ListField()
