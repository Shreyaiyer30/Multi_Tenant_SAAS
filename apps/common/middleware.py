import logging

from django.http import JsonResponse
from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.tenants.services import get_active_workspace

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """Resolves request.tenant and request.membership from X-Tenant header."""

    EXEMPT_PREFIXES = (
        "/admin/",
        "/api/v1/auth/register/",
        "/api/v1/auth/login/",
        "/api/v1/auth/refresh/",
        "/api/v1/auth/logout/",
        "/api/v1/auth/me/",
        "/api/v1/notifications/",
        "/api/v1/notifications/read/",
        "/api/v1/notifications/unread/",
        "/api/v1/billing/webhook/",
        "/api/v1/invites/",
        "/api/v1/schema/",
        "/api/v1/docs/",
        "/api/v1/workspaces/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        request.membership = None
        tenant_slug = request.headers.get("X-Tenant")

        user = getattr(request, "user", None)
        user_id = getattr(user, "id", None)
        user_email = getattr(user, "email", None)

        if request.path.startswith(self.EXEMPT_PREFIXES):
            logger.debug(
                "tenant_middleware_exempt path=%s user_id=%s user_email=%s x_tenant=%s",
                request.path,
                user_id,
                user_email,
                tenant_slug,
            )
            return self.get_response(request)

        if not request.path.startswith("/api/v1/"):
            return self.get_response(request)

        if not getattr(request, "user", None) or not request.user.is_authenticated:
            logger.debug(
                "tenant_middleware_unauthenticated path=%s x_tenant=%s",
                request.path,
                tenant_slug,
            )
            return self.get_response(request)

        try:
            tenant = get_active_workspace(request)
            membership = request.membership
        except Http404 as exc:
            code = str(exc) or "tenant_not_found"
            logger.warning(
                "tenant_middleware_not_found path=%s user_id=%s user_email=%s x_tenant=%s code=%s",
                request.path,
                user_id,
                user_email,
                tenant_slug,
                code,
            )
            return JsonResponse({"error": code}, status=404)
        except PermissionDenied:
            logger.warning(
                "tenant_middleware_access_denied path=%s user_id=%s user_email=%s x_tenant=%s",
                request.path,
                user_id,
                user_email,
                tenant_slug,
            )
            return JsonResponse({"error": "tenant_access_denied"}, status=403)

        logger.debug(
            "tenant_middleware_resolved path=%s user_id=%s user_email=%s x_tenant=%s tenant_resolved=%s role=%s",
            request.path,
            user_id,
            user_email,
            tenant_slug,
            tenant.slug,
            membership.role,
        )
        return self.get_response(request)
