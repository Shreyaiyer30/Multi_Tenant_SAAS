from django.db.models import Count, Q
from django.http import Http404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
import razorpay
from django.conf import settings

from apps.common.permissions import IsTenantAdminOrOwner, IsTenantMember, IsTenantOwner, PlanLimitPermission
from apps.tasks.models import ActivityEvent, Task
from apps.tenants.models import Membership, SubscriptionPlan, WorkspaceSubscription
from apps.tenants.serializers import (
    MembershipInviteSerializer,
    MembershipRoleUpdateSerializer,
    MembershipSerializer,
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
        Task.objects.filter(tenant=request.tenant, assignee=membership.user).update(assignee=None, updated_at=__import__("django.utils.timezone").utils.timezone.now())
        
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


def _ensure_default_plans():
    defaults = [
        {
            "name": "Free",
            "code": SubscriptionPlan.Code.FREE,
            "price": 0,
            "max_projects": 5,
            "max_users": 3,
        },
        {
            "name": "Pro",
            "code": SubscriptionPlan.Code.PRO,
            "price": 99900,
            "max_projects": 100,
            "max_users": 50,
        },
        {
            "name": "Enterprise",
            "code": SubscriptionPlan.Code.ENTERPRISE,
            "price": 299900,
            "max_projects": 1000,
            "max_users": 500,
        },
    ]
    for item in defaults:
        SubscriptionPlan.objects.get_or_create(
            name=item["name"],
            defaults=item,
        )


class BillingPlansAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        _ensure_default_plans()
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


class BillingCreateOrderAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantOwner]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        if not plan_id:
            return Response({"error": "validation_error", "detail": {"plan_id": ["This field is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        plan = SubscriptionPlan.objects.filter(id=plan_id, is_active=True).first()
        if not plan:
            return Response({"error": "not_found", "detail": {"plan_id": ["Plan not found."]}}, status=status.HTTP_404_NOT_FOUND)

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            return Response({"error": "configuration_error", "detail": {"detail": "Razorpay is not configured."}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        client = razorpay.Client(auth=(key_id, key_secret))
        order = client.order.create(
            {
                "amount": int(plan.price),
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "workspace_id": str(request.tenant.id),
                    "workspace_slug": request.tenant.slug,
                    "plan_id": str(plan.id),
                },
            }
        )

        subscription, _ = WorkspaceSubscription.objects.get_or_create(workspace=request.tenant)
        subscription.plan = plan
        subscription.razorpay_order_id = order.get("id", "")
        subscription.is_active = False
        subscription.save(update_fields=["plan", "razorpay_order_id", "is_active", "updated_at"])

        return Response(
            {
                "order_id": order.get("id"),
                "key": key_id,
                "amount": int(plan.price),
                "currency": "INR",
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

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
        if not key_id or not key_secret:
            return Response({"error": "configuration_error", "detail": {"detail": "Razorpay is not configured."}}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        subscription = WorkspaceSubscription.objects.filter(workspace=request.tenant, razorpay_order_id=order_id).select_related("plan").first()
        if not subscription or not subscription.plan:
            return Response({"error": "not_found", "detail": {"detail": "Subscription order not found for workspace."}}, status=status.HTTP_404_NOT_FOUND)

        client = razorpay.Client(auth=(key_id, key_secret))
        try:
            client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": order_id,
                    "razorpay_payment_id": payment_id,
                    "razorpay_signature": signature,
                }
            )
        except razorpay.errors.SignatureVerificationError:
            return Response({"error": "validation_error", "detail": {"detail": "Invalid payment signature."}}, status=status.HTTP_400_BAD_REQUEST)

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
