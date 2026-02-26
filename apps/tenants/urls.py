from django.urls import path

from apps.tenants.views import (
    MembershipDetailAPIView,
    MembershipListCreateAPIView,
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
]
