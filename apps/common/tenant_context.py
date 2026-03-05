import logging

from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.tenants.services import get_active_workspace

logger = logging.getLogger(__name__)

TENANT_ERROR_MESSAGES = {
    "missing_tenant_header": "Missing X-Tenant header.",
    "tenant_not_found": "Tenant not found.",
    "tenant_inactive": "Tenant is inactive.",
    "tenant_access_denied": "You are not a member of this tenant.",
}


def resolve_tenant_context(request):
    """
    Resolve and cache request.tenant + request.membership after DRF authentication.
    Returns True when tenant context is valid, else False and sets request.tenant_resolution_error.
    """
    cached = getattr(request, "_tenant_context_resolved", None)
    if cached is not None:
        return bool(cached)

    request.tenant = getattr(request, "tenant", None)
    request.membership = getattr(request, "membership", None)
    request.tenant_resolution_error = None

    if request.tenant is not None and request.membership is not None:
        request._tenant_context_resolved = True
        return True

    user = getattr(request, "user", None)
    user_id = getattr(user, "id", None)
    user_email = getattr(user, "email", None)
    tenant_slug = request.headers.get("X-Tenant")

    try:
        get_active_workspace(request)
    except Http404 as exc:
        request.tenant_resolution_error = str(exc) or "tenant_not_found"
        request._tenant_context_resolved = False
        logger.debug(
            "tenant_context_failed reason=%s user_id=%s email=%s x_tenant=%s",
            request.tenant_resolution_error,
            user_id,
            user_email,
            tenant_slug,
        )
        return False
    except PermissionDenied:
        request.tenant_resolution_error = "tenant_access_denied"
        request._tenant_context_resolved = False
        logger.debug(
            "tenant_context_failed reason=%s user_id=%s email=%s x_tenant=%s",
            request.tenant_resolution_error,
            user_id,
            user_email,
            tenant_slug,
        )
        return False

    request.tenant_resolution_error = None
    request._tenant_context_resolved = True

    logger.debug(
        "tenant_context_resolved user_id=%s email=%s x_tenant=%s role=%s",
        getattr(user, "id", None),
        getattr(user, "email", None),
        tenant_slug,
        request.membership.role,
    )
    return True
