from django.urls import path

from apps.dashboard.views import (
    DashboardOverviewAPIView,
    DashboardRecentActivityAPIView,
    DashboardTasksTrendAPIView,
    DashboardTeamPerformanceAPIView,
)

urlpatterns = [
    path("dashboard/overview/", DashboardOverviewAPIView.as_view(), name="dashboard-overview"),
    path("dashboard/recent-activity/", DashboardRecentActivityAPIView.as_view(), name="dashboard-recent-activity"),
    path("dashboard/tasks-trend/", DashboardTasksTrendAPIView.as_view(), name="dashboard-tasks-trend"),
    path("dashboard/team-performance/", DashboardTeamPerformanceAPIView.as_view(), name="dashboard-team-performance"),
]
