from django.urls import path

from apps.billing.views import (
    BillingCancelAPIView,
    BillingCheckoutAPIView,
    BillingInvoicesAPIView,
    BillingStatusAPIView,
    BillingWebhookAPIView,
)

urlpatterns = [
    path("billing/", BillingStatusAPIView.as_view(), name="billing-status"),
    path("billing/checkout/", BillingCheckoutAPIView.as_view(), name="billing-checkout"),
    path("billing/cancel/", BillingCancelAPIView.as_view(), name="billing-cancel"),
    path("billing/invoices/", BillingInvoicesAPIView.as_view(), name="billing-invoices"),
    path("billing/webhook/", BillingWebhookAPIView.as_view(), name="billing-webhook"),
]
