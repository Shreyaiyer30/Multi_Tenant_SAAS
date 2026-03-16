import logging

from django.conf import settings
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.serializers import (
    LoginResponseSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.tenants.models import Membership

logger = logging.getLogger(__name__)


def _workspace_payload(membership):
    return {
        "id": membership.tenant.id,
        "name": membership.tenant.name,
        "slug": membership.tenant.slug,
        "plan": membership.tenant.plan,
        "role": membership.role,
    }


def _sanitize_register_payload(data):
    if not isinstance(data, dict):
        return {"_non_dict_payload": True}
    sanitized = dict(data)
    if "password" in sanitized:
        sanitized["password"] = "***REDACTED***"
    return sanitized


class RegisterAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: RegisterResponseSerializer},
        examples=[
            OpenApiExample(
                "Register Request",
                value={
                    "email": "alice@acme.com",
                    "password": "SecurePass123!",
                    "first_name": "Alice",
                    "last_name": "Smith",
                    "create_workspace": True,
                    "workspace_name": "Acme Corp",
                },
                request_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if settings.DEBUG:
            logger.debug(
                "register_request",
                extra={
                    "content_type": request.content_type,
                    "data": _sanitize_register_payload(request.data),
                },
            )

        if not serializer.is_valid():
            if settings.DEBUG:
                logger.debug(
                    "register_validation_failed",
                    extra={
                        "is_valid": False,
                        "errors": serializer.errors,
                    },
                )
            return Response(
                {"error": "validation_error", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = serializer.save()

        user = result["user"]
        workspace = result["workspace"]
        memberships = (
            Membership.objects.filter(user=user)
            .select_related("tenant")
            .order_by("joined_at")
        )
        refresh = RefreshToken.for_user(user)
        workspaces = [_workspace_payload(membership) for membership in memberships]

        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "workspace": None,
            "active_workspace": workspace.slug if workspace else (workspaces[0]["slug"] if workspaces else ""),
            "workspaces": workspaces,
        }

        if workspace:
            data["workspace"] = {
                "id": workspace.id,
                "name": workspace.name,
                "slug": workspace.slug,
                "plan": workspace.plan,
            }

        return Response(data, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={200: LoginResponseSerializer},
        examples=[
            OpenApiExample(
                "Login Request",
                value={"email": "alice@acme.com", "password": "SecurePass123!"},
                request_only=True,
            ),
        ],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        memberships = (
            Membership.objects.filter(user=user)
            .select_related("tenant")
            .order_by("joined_at")
        )
        workspaces = [_workspace_payload(membership) for membership in memberships]
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "active_workspace": workspaces[0]["slug"] if workspaces else "",
                "workspaces": workspaces,
            },
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={205: OpenApiResponse(description="Reset Content")})
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = RefreshToken(serializer.validated_data["refresh"])
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request):
        workspaces = Membership.objects.filter(user=request.user).select_related("tenant")
        return Response(
            {
                **UserSerializer(request.user).data,
                "date_joined": request.user.date_joined,
                "workspaces": [
                    {
                        "id": membership.tenant.id,
                        "name": membership.tenant.name,
                        "slug": membership.tenant.slug,
                        "plan": membership.tenant.plan,
                        "role": membership.role,
                    }
                    for membership in workspaces
                ],
            }
        )


class RefreshAPIView(TokenRefreshView):
    permission_classes = [AllowAny]
