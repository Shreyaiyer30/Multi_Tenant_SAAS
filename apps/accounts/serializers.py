from django.contrib.auth import authenticate, get_user_model, password_validation
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant

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

        create_workspace = attrs.get("create_workspace", False)
        workspace_name = attrs.get("workspace_name")
        if create_workspace and not workspace_name:
            raise serializers.ValidationError({"workspace_name": ["This field is required when create_workspace is true."]})

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        create_workspace = validated_data.pop("create_workspace", False)
        workspace_name = validated_data.pop("workspace_name", None)

        user = User.objects.create_user(**validated_data)
        workspace = None

        if create_workspace:
            base_slug = slugify(workspace_name)
            slug = base_slug
            counter = 1
            while Tenant.objects.filter(slug=slug).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"

            workspace = Tenant.objects.create(name=workspace_name, slug=slug)
            Membership.objects.create(tenant=workspace, user=user, role=Membership.Role.OWNER)

        return {"user": user, "workspace": workspace}


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


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()
