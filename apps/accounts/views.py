from django.db.models import F
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
        serializer.is_valid(raise_exception=True)
        result = serializer.save()

        user = result["user"]
        workspace = result["workspace"]
        refresh = RefreshToken.for_user(user)

        data = {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "workspace": None,
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
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
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
