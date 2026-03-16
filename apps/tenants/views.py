from django.db.models import Count
from django.http import Http404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.services import ensure_default_plans, get_razorpay_client
from apps.common.permissions import IsTenantAdminOrOwner, IsTenantMember, IsTenantOwner, PlanLimitPermission
from apps.tasks.models import ActivityEvent, Task
from apps.tenants.models import Membership, SubscriptionPlan, WorkspaceInvite, WorkspaceSubscription
from apps.tenants.serializers import (
    InviteAcceptSerializer,
    InviteTokenPreviewSerializer,
    MembershipInviteSerializer,
    MembershipRoleUpdateSerializer,
    MembershipSerializer,
    WorkspaceInviteCreateSerializer,
    WorkspaceInviteSerializer,
    SubscriptionPlanSerializer,
    TenantCreateSerializer,
    TenantSerializer,
    WorkspaceSubscriptionSerializer,
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


class WorkspaceInviteListCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner]

    def get(self, request):
        rows = WorkspaceInvite.objects.filter(tenant=request.tenant).select_related("tenant").order_by("-created_at")
        return Response(WorkspaceInviteSerializer(rows, many=True).data)

    def post(self, request):
        serializer = WorkspaceInviteCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        invite = serializer.save()
        return Response(WorkspaceInviteSerializer(invite).data, status=status.HTTP_201_CREATED)


class WorkspaceInvitePreviewAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token):
        serializer = InviteTokenPreviewSerializer(data={"token": token})
        serializer.is_valid(raise_exception=True)
        invite = serializer.context["invite"]
        return Response(
            {
                "valid": invite.is_active,
                "email": invite.email,
                "role": invite.role,
                "workspace": {"id": invite.tenant_id, "slug": invite.tenant.slug, "name": invite.tenant.name},
                "expires_at": invite.expires_at,
                "accepted_at": invite.accepted_at,
            }
        )


class WorkspaceInviteAcceptAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InviteAcceptSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        return Response(
            {
                "success": True,
                "workspace": {
                    "id": membership.tenant_id,
                    "slug": membership.tenant.slug,
                    "name": membership.tenant.name,
                    "role": membership.role,
                },
            }
        )


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
        # Unassign tasks across all projects in this tenant
        Task.objects.filter(tenant=request.tenant, assignee=membership.user).update(
            assignee=None,
            updated_at=timezone.now(),
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
        today = timezone.localdate()

        overview = {
            "total_members": tenant.memberships.count(),
            "total_projects": projects.count(),
            "total_tasks": tasks.count(),
            "active_tasks": tasks.exclude(status=Task.Status.DONE).count(),
            "completed_tasks": tasks.filter(status=Task.Status.DONE).count(),
            "overdue_tasks": tasks.filter(due_date__lt=today).exclude(status=Task.Status.DONE).count(),
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


class BillingPlansAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        ensure_default_plans()
        plans = SubscriptionPlan.objects.filter(is_active=True).order_by("price", "name")
        subscription = WorkspaceSubscription.objects.filter(workspace=request.tenant).select_related("plan").first()
        return Response(
            {
                "plans": SubscriptionPlanSerializer(plans, many=True).data,
                "subscription": WorkspaceSubscriptionSerializer(subscription).data if subscription else None,
                "workspace": {
                    "id": str(request.tenant.id),
                    "slug": request.tenant.slug,
                    "plan": request.tenant.plan,
                    "max_users": request.tenant.max_users,
                    "max_projects": request.tenant.max_projects,
                },
            }
        )


class BillingVerifyPaymentAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantOwner]

    def post(self, request):

        order_id = request.data.get("razorpay_order_id")
        payment_id = request.data.get("razorpay_payment_id")
        signature = request.data.get("razorpay_signature")

        missing = {}
        if not order_id:
            missing["razorpay_order_id"] = ["This field is required."]
        if not payment_id:
            missing["razorpay_payment_id"] = ["This field is required."]
        if not signature:
            missing["razorpay_signature"] = ["This field is required."]
        if missing:
            return Response({"error": "validation_error", "detail": missing}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client, _ = get_razorpay_client()
        except ValidationError as exc:
            detail = exc.detail if hasattr(exc, "detail") else {"detail": str(exc)}
            if not isinstance(detail, dict):
                detail = {"detail": detail}
            return Response(
                {"error": "configuration_error", "detail": {"detail": detail.get("detail", detail)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        subscription = WorkspaceSubscription.objects.filter(workspace=request.tenant, razorpay_order_id=order_id).select_related("plan").first()
        if not subscription or not subscription.plan:
            return Response({"error": "not_found", "detail": {"detail": "Subscription order not found for workspace."}}, status=status.HTTP_404_NOT_FOUND)

        try:
            client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                }
            )
        except Exception as exc:
            if exc.__class__.__name__ == "SignatureVerificationError":
                return Response({"error": "validation_error", "detail": {"detail": "Invalid payment signature."}}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {"error": "server_error", "detail": {"detail": str(exc)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        plan = subscription.plan
        subscription.razorpay_payment_id = payment_id
        subscription.is_active = True
        subscription.start_date = timezone.now()
        subscription.save(update_fields=["razorpay_payment_id", "is_active", "start_date", "updated_at"])

        request.tenant.plan = plan.code
        request.tenant.max_users = plan.max_users
        request.tenant.max_projects = plan.max_projects
        request.tenant.save(update_fields=["plan", "max_users", "max_projects", "updated_at"])

        return Response(
            {
                "success": True,
                "workspace_plan": request.tenant.plan,
                "max_users": request.tenant.max_users,
                "max_projects": request.tenant.max_projects,
                "subscription": WorkspaceSubscriptionSerializer(subscription).data,
            }
        )
