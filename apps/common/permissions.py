from rest_framework import permissions

from apps.tenants.models import Membership
from apps.common.tenant_context import TENANT_ERROR_MESSAGES, resolve_tenant_context


class IsTenantMember(permissions.BasePermission):
    message = TENANT_ERROR_MESSAGES["tenant_access_denied"]

    def has_permission(self, request, view):
        resolved = resolve_tenant_context(request)
        if not resolved:
            self.message = TENANT_ERROR_MESSAGES.get(
                getattr(request, "tenant_resolution_error", "tenant_access_denied"),
                TENANT_ERROR_MESSAGES["tenant_access_denied"],
            )
        return resolved


class IsTenantAdminOrOwner(permissions.BasePermission):
    message = "Admin or owner role required."

    def has_permission(self, request, view):
        if not resolve_tenant_context(request):
            self.message = TENANT_ERROR_MESSAGES.get(
                getattr(request, "tenant_resolution_error", "tenant_access_denied"),
                TENANT_ERROR_MESSAGES["tenant_access_denied"],
            )
            return False
        membership = getattr(request, "membership", None)
        return bool(membership and membership.role in {Membership.Role.ADMIN, Membership.Role.OWNER})


class IsTenantOwner(permissions.BasePermission):
    message = "Owner role required."

    def has_permission(self, request, view):
        if not resolve_tenant_context(request):
            self.message = TENANT_ERROR_MESSAGES.get(
                getattr(request, "tenant_resolution_error", "tenant_access_denied"),
                TENANT_ERROR_MESSAGES["tenant_access_denied"],
            )
            return False
        membership = getattr(request, "membership", None)
        return bool(membership and membership.role == Membership.Role.OWNER)


class IsResourceOwnerOrTenantAdmin(permissions.BasePermission):
    owner_field = "created_by"

    def has_object_permission(self, request, view, obj):
        if not resolve_tenant_context(request):
            return False

        membership = getattr(request, "membership", None)
        if membership and membership.role in {Membership.Role.ADMIN, Membership.Role.OWNER}:
            return True

        owner = getattr(obj, self.owner_field, None)
        return bool(owner and owner == request.user)


class PlanLimitPermission(permissions.BasePermission):
    """Checks plan limits on create operations for selected endpoints."""

    def has_permission(self, request, view):
        if request.method != "POST":
            return True

        if not resolve_tenant_context(request):
            self.message = TENANT_ERROR_MESSAGES.get(
                getattr(request, "tenant_resolution_error", "tenant_access_denied"),
                TENANT_ERROR_MESSAGES["tenant_access_denied"],
            )
            return False

        tenant = request.tenant

        plan_limit_key = getattr(view, "plan_limit_key", None)
        if not plan_limit_key:
            return True

        if plan_limit_key == "members":
            current = tenant.memberships.count()
            max_allowed = tenant.max_users
        elif plan_limit_key == "projects":
            current = tenant.projects_project_items.count()
            max_allowed = tenant.max_projects
        else:
            return True

        if max_allowed is None:
            return True

        if current >= max_allowed:
            self.message = {
                "error": "plan_limit_reached",
                "limit": plan_limit_key,
                "current": current,
                "max": max_allowed,
            }
            return False

        return True


class ProPlanRequired(permissions.BasePermission):
    def has_permission(self, request, view):
        if not resolve_tenant_context(request):
            return False
        tenant = request.tenant
        return tenant.plan in {"pro", "enterprise"}
