from django.urls import path

from apps.tenants.views import MembershipDetailAPIView, MembershipListCreateAPIView, WorkspaceDashboardAPIView, WorkspaceListCreateAPIView

urlpatterns = [
    path("workspaces/", WorkspaceListCreateAPIView.as_view(), name="workspace-list-create"),
    path("workspace/dashboard/", WorkspaceDashboardAPIView.as_view(), name="workspace-dashboard"),
    path("members/", MembershipListCreateAPIView.as_view(), name="member-list-create"),
    path("members/<uuid:membership_id>/", MembershipDetailAPIView.as_view(), name="member-detail"),
]
