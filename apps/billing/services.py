from django.conf import settings
from rest_framework.exceptions import ValidationError

from apps.tenants.models import SubscriptionPlan, WorkspaceSubscription


def get_razorpay_client():
    try:
        import razorpay
    except ModuleNotFoundError as exc:
        message = "Razorpay SDK is not installed."
        if exc.name == "pkg_resources":
            message = "Missing dependency pkg_resources. Install setuptools."
        raise ValidationError({"detail": message}, code="configuration_error") from exc

    key_id = getattr(settings, "RAZORPAY_KEY_ID", "")
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise ValidationError({"detail": "Razorpay is not configured."}, code="configuration_error")

    return razorpay.Client(auth=(key_id, key_secret)), key_id


def ensure_default_plans():
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
            "price": 59900,
            "max_projects": 50,
            "max_users": 50,
        },
        {
            "name": "Enterprise",
            "code": SubscriptionPlan.Code.ENTERPRISE,
            "price": 99900,
            "max_projects": 100,
            "max_users": 500,
        },
    ]
    for item in defaults:
        SubscriptionPlan.objects.update_or_create(name=item["name"], defaults=item)


def resolve_plan(plan_value=None, plan_id=None):
    ensure_default_plans()

    queryset = SubscriptionPlan.objects.filter(is_active=True)
    plan = None

    if plan_id:
        plan = queryset.filter(id=plan_id).first()
    if not plan and plan_value:
        normalized = str(plan_value).strip().lower()
        if normalized:
            plan = queryset.filter(code=normalized).first()

    if not plan:
        raise ValidationError({"plan": ["Valid plan is required."]}, code="validation_error")

    return plan


def create_workspace_order(*, tenant, plan):
    client, key_id = get_razorpay_client()
    order = client.order.create(
        {
            "amount": int(plan.price),
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "workspace_id": str(tenant.id),
                "workspace_slug": tenant.slug,
                "plan_id": str(plan.id),
                "plan_code": plan.code,
            },
        }
    )

    subscription, _ = WorkspaceSubscription.objects.get_or_create(workspace=tenant)
    subscription.plan = plan
    subscription.razorpay_order_id = order.get("id", "")
    subscription.is_active = False
    subscription.save(update_fields=["plan", "razorpay_order_id", "is_active", "updated_at"])

    return {
        "order_id": order.get("id"),
        "amount": int(plan.price),
        "currency": "INR",
        "key": key_id,
    }
