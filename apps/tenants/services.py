from django.http import Http404
from rest_framework.exceptions import PermissionDenied

from apps.tenants.models import Membership, Tenant


def get_active_workspace(request):
    tenant_slug = (request.headers.get("X-Tenant") or "").strip()
    if not tenant_slug:
        raise Http404("missing_tenant_header")

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        raise PermissionDenied("tenant_access_denied")

    tenant = Tenant.objects.filter(slug=tenant_slug).first()
    if tenant is None:
        raise Http404("tenant_not_found")
    if not tenant.is_active:
        raise Http404("tenant_inactive")

    membership = Membership.objects.select_related("tenant", "user").filter(tenant=tenant, user=user).first()
    if membership is None:
        raise PermissionDenied("tenant_access_denied")

    request.tenant = tenant
    request.membership = membership
    return tenant
