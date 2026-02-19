from django.http import JsonResponse


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
        "/api/v1/schema/",
        "/api/v1/docs/",
        "/api/v1/workspaces/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = None
        request.membership = None

        if request.path.startswith(self.EXEMPT_PREFIXES):
            return self.get_response(request)

        if not request.path.startswith("/api/v1/"):
            return self.get_response(request)

        if not getattr(request, "user", None) or not request.user.is_authenticated:
            return self.get_response(request)

        tenant_slug = request.headers.get("X-Tenant")
        if not tenant_slug:
            return JsonResponse({"error": "missing_tenant_header"}, status=400)

        from apps.tenants.models import Membership, Tenant

        try:
            tenant = Tenant.objects.get(slug=tenant_slug)
        except Tenant.DoesNotExist:
            return JsonResponse({"error": "tenant_not_found"}, status=404)

        if not tenant.is_active:
            return JsonResponse({"error": "tenant_inactive"}, status=403)

        try:
            membership = Membership.objects.select_related("tenant", "user").get(
                tenant=tenant,
                user=request.user,
            )
        except Membership.DoesNotExist:
            return JsonResponse({"error": "tenant_access_denied"}, status=403)

        request.tenant = tenant
        request.membership = membership
        return self.get_response(request)
