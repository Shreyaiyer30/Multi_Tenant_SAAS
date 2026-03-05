from django.urls import path

from apps.tenants.views import (
    BillingCreateOrderAPIView,
    BillingPlansAPIView,
    BillingVerifyPaymentAPIView,
    MembershipDetailAPIView,
    MembershipListCreateAPIView,
    WorkspaceInviteAcceptAPIView,
    WorkspaceInviteListCreateAPIView,
    WorkspaceInvitePreviewAPIView,
    WorkspaceDashboardAPIView,
    WorkspaceDashboardChartsAPIView,
    WorkspaceDashboardSummaryAPIView,
    WorkspaceListCreateAPIView,
)

urlpatterns = [
    path("workspaces/", WorkspaceListCreateAPIView.as_view(), name="workspace-list-create"),
    path("workspace/dashboard/", WorkspaceDashboardAPIView.as_view(), name="workspace-dashboard"),
    path("workspace/dashboard/summary/", WorkspaceDashboardSummaryAPIView.as_view(), name="workspace-dashboard-summary"),
    path("workspace/dashboard/charts/", WorkspaceDashboardChartsAPIView.as_view(), name="workspace-dashboard-charts"),
    path("members/", MembershipListCreateAPIView.as_view(), name="member-list-create"),
    path("members/<uuid:membership_id>/", MembershipDetailAPIView.as_view(), name="member-detail"),
    path("invites/", WorkspaceInviteListCreateAPIView.as_view(), name="workspace-invite-list-create"),
    path("invites/accept/", WorkspaceInviteAcceptAPIView.as_view(), name="workspace-invite-accept"),
    path("invites/preview/<str:token>/", WorkspaceInvitePreviewAPIView.as_view(), name="workspace-invite-preview"),
    path("billing/plans/", BillingPlansAPIView.as_view(), name="billing-plans"),
    path("billing/create-order/", BillingCreateOrderAPIView.as_view(), name="billing-create-order"),
    path("billing/verify-payment/", BillingVerifyPaymentAPIView.as_view(), name="billing-verify-payment"),
]
