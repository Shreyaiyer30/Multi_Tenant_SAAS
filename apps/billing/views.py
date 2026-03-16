from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.billing.services import create_workspace_order, resolve_plan
from apps.common.permissions import IsTenantMember, IsTenantOwner

try:
    import razorpay
except ModuleNotFoundError:
    razorpay = None

client = (
    razorpay.Client(
        auth=(getattr(settings, "RAZORPAY_KEY_ID", ""), getattr(settings, "RAZORPAY_KEY_SECRET", ""))
    )
    if razorpay and getattr(settings, "RAZORPAY_KEY_ID", "") and getattr(settings, "RAZORPAY_KEY_SECRET", "")
    else None
)


def _as_detail_dict(detail):
    if isinstance(detail, dict):
        return detail
    return {"detail": detail}


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsTenantMember, IsTenantOwner])
def create_order(request):
    plan_value = (request.data.get("plan") or "").strip().lower()
    plan_id = request.data.get("plan_id")

    if not plan_value and not plan_id:
        return Response({"error": "Plan is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        plan = resolve_plan(
            plan_value=plan_value or None,
            plan_id=plan_id,
        )
        order_payload = create_workspace_order(
            tenant=request.tenant,
            plan=plan,
            client=client,
            key_id=getattr(settings, "RAZORPAY_KEY_ID", None),
        )
        return Response(order_payload, status=status.HTTP_200_OK)
    except ValidationError as exc:
        detail = _as_detail_dict(exc.detail if hasattr(exc, "detail") else str(exc))
        code = getattr(exc, "default_code", "validation_error")
        if code == "configuration_error":
            return Response(
                {"error": code, "detail": {"detail": detail.get("detail", detail)}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"error": "Invalid plan", "detail": detail}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response(
            {"error": "server_error", "detail": {"detail": str(exc)}},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
