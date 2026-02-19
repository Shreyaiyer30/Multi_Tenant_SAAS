from rest_framework import permissions

from apps.tenants.models import Membership


class IsTenantMember(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(getattr(request, "membership", None))


class IsTenantAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        membership = getattr(request, "membership", None)
        return bool(membership and membership.role in {Membership.Role.ADMIN, Membership.Role.OWNER})


class IsTenantOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        membership = getattr(request, "membership", None)
        return bool(membership and membership.role == Membership.Role.OWNER)


class IsResourceOwnerOrTenantAdmin(permissions.BasePermission):
    owner_field = "created_by"

    def has_object_permission(self, request, view, obj):
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

        tenant = getattr(request, "tenant", None)
        if not tenant:
            return True

        plan_limit_key = getattr(view, "plan_limit_key", None)
        if not plan_limit_key:
            return True

        if plan_limit_key == "members":
            current = tenant.memberships.count()
            max_allowed = tenant.max_users
        elif plan_limit_key == "projects":
            current = tenant.projects.count()
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
                "upgrade_url": "https://app.tasksaas.com/billing",
            }
            return False

        return True


class ProPlanRequired(permissions.BasePermission):
    def has_permission(self, request, view):
        tenant = getattr(request, "tenant", None)
        if not tenant:
            return False
        return tenant.plan in {"pro", "enterprise"}
