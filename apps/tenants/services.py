import hashlib
import hmac
from typing import Any

from django.conf import settings
from django.http import Http404
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from apps.tenants.models import BillingWebhookEvent, Membership, Tenant, WorkspaceSubscription


def get_active_workspace(request):
    tenant_slug = (request.headers.get("X-Tenant") or "").strip()
    if not tenant_slug:
        raise Http404("missing_tenant_header")

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        raise PermissionDenied("tenant_access_denied")

    tenant = Tenant.objects.filter(slug=tenant_slug, is_active=True).first()
    if tenant is None:
        raise Http404("tenant_not_found")

    membership = Membership.objects.select_related("tenant", "user").filter(tenant=tenant, user=user).first()
    if membership is None:
        raise PermissionDenied("tenant_access_denied")

    request.tenant = tenant
    request.membership = membership
    return tenant


def verify_razorpay_webhook_signature(raw_body: bytes, received_signature: str) -> bool:
    secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "")
    if not secret or not received_signature:
        return False
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, received_signature)


def webhook_event_id(payload: dict[str, Any], raw_body: bytes) -> str:
    explicit_id = payload.get("id")
    if explicit_id:
        return str(explicit_id)
    return hashlib.sha256(raw_body).hexdigest()


@transaction.atomic
def process_razorpay_event(event: BillingWebhookEvent) -> BillingWebhookEvent:
    payload = event.payload or {}
    event_type = payload.get("event", "")
    payment_entity = (((payload.get("payload") or {}).get("payment") or {}).get("entity") or {})
    order_id = payment_entity.get("order_id", "")
    payment_id = payment_entity.get("id", "")

    subscription = WorkspaceSubscription.objects.select_related("workspace", "plan").filter(razorpay_order_id=order_id).first()
    event.subscription = subscription
    event.workspace = subscription.workspace if subscription else None

    if not subscription:
        event.status = BillingWebhookEvent.Status.IGNORED
        event.failure_reason = "Subscription not found for order."
        event.processed_at = timezone.now()
        event.save(update_fields=["subscription", "workspace", "status", "failure_reason", "processed_at", "updated_at"])
        return event

    if event_type == "payment.captured":
        subscription.razorpay_payment_id = payment_id
        subscription.is_active = True
        if not subscription.start_date:
            subscription.start_date = timezone.now()
        subscription.save(update_fields=["razorpay_payment_id", "is_active", "start_date", "updated_at"])

        if subscription.plan:
            workspace = subscription.workspace
            workspace.plan = subscription.plan.code
            workspace.max_users = subscription.plan.max_users
            workspace.max_projects = subscription.plan.max_projects
            workspace.save(update_fields=["plan", "max_users", "max_projects", "updated_at"])

        event.status = BillingWebhookEvent.Status.PROCESSED
        event.failure_reason = ""
    elif event_type == "payment.failed":
        subscription.razorpay_payment_id = payment_id or subscription.razorpay_payment_id
        subscription.is_active = False
        subscription.save(update_fields=["razorpay_payment_id", "is_active", "updated_at"])
        event.status = BillingWebhookEvent.Status.PROCESSED
        event.failure_reason = ""
    else:
        event.status = BillingWebhookEvent.Status.IGNORED
        event.failure_reason = "Unhandled event type."

    event.processed_at = timezone.now()
    event.save(update_fields=["subscription", "workspace", "status", "failure_reason", "processed_at", "updated_at"])
    return event
