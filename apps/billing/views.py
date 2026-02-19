import os

from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantOwner
from apps.tenants.models import Tenant


class BillingStatusAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]

    def get(self, request):
        t = request.tenant
        return Response(
            {
                "plan": t.plan,
                "stripe_customer_id": t.stripe_customer_id,
                "stripe_subscription_id": t.stripe_subscription_id,
                "subscription_status": t.subscription_status,
                "current_period_end": t.current_period_end,
                "cancel_at_period_end": t.cancel_at_period_end,
                "invoices": [],
            }
        )


class BillingCheckoutAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]

    def post(self, request):
        plan = request.data.get("plan")
        if plan != "pro":
            return Response(
                {"error": "validation_error", "detail": {"plan": ["Only pro is supported."]}},
                status=400,
            )

        razorpay_key_id = os.getenv("RAZORPAY_KEY_ID", "")
        razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        pro_amount_inr = int(os.getenv("RAZORPAY_PRO_PLAN_AMOUNT_INR", "999"))

        if not razorpay_key_id or not razorpay_key_secret:
            return Response(
                {
                    "error": "configuration_error",
                    "detail": "Razorpay keys are not configured.",
                },
                status=500,
            )

        try:
            import razorpay
        except ImportError:
            return Response(
                {
                    "error": "configuration_error",
                    "detail": "razorpay package is not installed.",
                },
                status=500,
            )

        client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
        amount_paise = pro_amount_inr * 100
        order = client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": f"tenant_{request.tenant.id}",
                "notes": {
                    "tenant_slug": request.tenant.slug,
                    "plan": "pro",
                    "user_id": str(request.user.id),
                },
            }
        )

        return Response(
            {
                "provider": "razorpay",
                "key_id": razorpay_key_id,
                "order_id": order["id"],
                "amount": order["amount"],
                "currency": order["currency"],
                "plan": "pro",
            }
        )


class BillingCancelAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]

    def post(self, request):
        t = request.tenant
        t.cancel_at_period_end = True
        if not t.current_period_end:
            t.current_period_end = timezone.now()
        t.save(update_fields=["cancel_at_period_end", "current_period_end"])
        return Response({"cancel_date": t.current_period_end})


class BillingInvoicesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantOwner]

    def get(self, request):
        return Response({"results": []})


class BillingWebhookAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        event_type = request.data.get("type")
        tenant_slug = request.data.get("data", {}).get("object", {}).get("metadata", {}).get("tenant_slug")
        if not tenant_slug:
            return Response({"received": True})

        tenant = Tenant.objects.filter(slug=tenant_slug).first()
        if not tenant:
            return Response({"received": True})

        if event_type in {"checkout.session.completed", "customer.subscription.updated"}:
            tenant.plan = Tenant.Plan.PRO
            tenant.max_users = 1000000
            tenant.max_projects = 1000000
        elif event_type == "customer.subscription.deleted":
            tenant.plan = Tenant.Plan.FREE
            tenant.max_users = 3
            tenant.max_projects = 5
        tenant.save(update_fields=["plan", "max_users", "max_projects"])

        return Response({"received": True})
