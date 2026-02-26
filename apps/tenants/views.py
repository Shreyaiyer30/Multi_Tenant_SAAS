from django.db.models import Count, Q
from django.http import Http404
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantAdminOrOwner, IsTenantMember, IsTenantOwner, PlanLimitPermission
from apps.tasks.models import ActivityEvent, Task
from apps.tenants.models import Membership
from apps.tenants.serializers import (
    MembershipInviteSerializer,
    MembershipRoleUpdateSerializer,
    MembershipSerializer,
    TenantCreateSerializer,
    TenantSerializer,
)


def _assert_manage_members_allowed(request):
    if not request.membership or request.membership.role not in {Membership.Role.OWNER, Membership.Role.ADMIN}:
        raise PermissionDenied("Only admin or owner can manage members.")


class WorkspaceListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memberships = Membership.objects.filter(user=request.user).select_related("tenant")
        return Response(TenantSerializer([m.tenant for m in memberships], many=True).data)

    def post(self, request):
        serializer = TenantCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        tenant = serializer.save()
        return Response(TenantSerializer(tenant).data, status=status.HTTP_201_CREATED)


class MembershipListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, PlanLimitPermission]
    plan_limit_key = "members"

    def get(self, request):
        queryset = Membership.objects.filter(tenant=request.tenant).select_related("user", "tenant")
        return Response(MembershipSerializer(queryset, many=True).data)

    def post(self, request):
        _assert_manage_members_allowed(request)
        serializer = MembershipInviteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        return Response(MembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class MembershipDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_object(self, request, membership_id):
        try:
            return Membership.objects.select_related("user", "tenant").get(id=membership_id, tenant=request.tenant)
        except Membership.DoesNotExist as exc:
            raise Http404 from exc

    def patch(self, request, membership_id):
        _assert_manage_members_allowed(request)
        membership = self.get_object(request, membership_id)
        serializer = MembershipRoleUpdateSerializer(membership, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(MembershipSerializer(membership).data)

    def delete(self, request, membership_id):
        _assert_manage_members_allowed(request)
        membership = self.get_object(request, membership_id)
        if membership.role == Membership.Role.OWNER:
            owner_count = Membership.objects.filter(tenant=request.tenant, role=Membership.Role.OWNER).count()
            if owner_count == 1:
                return Response(
                    {"error": "cannot_remove_last_owner"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceDashboardAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner]

    @staticmethod
    def _build_payload(request):
        tenant = request.tenant
        tasks = tenant.tasks_task_items.all()
        projects = tenant.projects_project_items.all()

        overview = {
            "total_members": tenant.memberships.count(),
            "total_projects": projects.count(),
            "total_tasks": tasks.count(),
            "active_tasks": tasks.exclude(status=Task.Status.DONE).count(),
            "completed_tasks": tasks.filter(status=Task.Status.DONE).count(),
            "overdue_tasks": tasks.filter(due_date__lt=__import__("django.utils.timezone").utils.timezone.localdate()).exclude(status=Task.Status.DONE).count(),
        }
        
        total_tasks = overview["total_tasks"]
        completed_tasks = overview["completed_tasks"]
        overview["completion_rate"] = int((completed_tasks / total_tasks) * 100) if total_tasks else 0

        status_counts = tasks.values("status").annotate(total=Count("id"))
        priority_counts = tasks.values("priority").annotate(total=Count("id"))

        recent = ActivityEvent.objects.filter(tenant=tenant).select_related("actor", "task")[:10]
        recent_payload = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "task_id": e.task_id,
                "actor": {"id": e.actor_id, "display_name": e.actor.display_name},
                "created_at": e.created_at,
            }
            for e in recent
        ]

        return {
            "overview": overview,
            "tasks_by_status": {row["status"]: row["total"] for row in status_counts},
            "tasks_by_priority": {row["priority"]: row["total"] for row in priority_counts},
            "recent_activity": recent_payload,
            "members_summary": [],
            "projects_summary": [],
        }

    def get(self, request):
        return Response(self._build_payload(request))


class WorkspaceDashboardSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner]

    def get(self, request):
        payload = WorkspaceDashboardAPIView._build_payload(request)
        return Response(payload["overview"])


class WorkspaceDashboardChartsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner]

    def get(self, request):
        payload = WorkspaceDashboardAPIView._build_payload(request)
        return Response({"tasks_by_status": payload["tasks_by_status"], "tasks_by_priority": payload["tasks_by_priority"]})
