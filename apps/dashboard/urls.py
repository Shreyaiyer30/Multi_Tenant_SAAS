from django.urls import path

from apps.dashboard.views import (
    DashboardOverviewAPIView,
    DashboardRecentActivityAPIView,
    DashboardStatsAPIView,
    DashboardTasksComparisonAPIView,
    DashboardTasksTrendAPIView,
    DashboardTeamPerformanceAPIView,
)

urlpatterns = [
    path("dashboard/overview/", DashboardOverviewAPIView.as_view(), name="dashboard-overview"),
    path("dashboard/stats/", DashboardStatsAPIView.as_view(), name="dashboard-stats"),
    path("dashboard/recent-activity/", DashboardRecentActivityAPIView.as_view(), name="dashboard-recent-activity"),
    path("dashboard/tasks-trend/", DashboardTasksTrendAPIView.as_view(), name="dashboard-tasks-trend"),
    path("dashboard/tasks-comparison/", DashboardTasksComparisonAPIView.as_view(), name="dashboard-tasks-comparison"),
    path("dashboard/team-performance/", DashboardTeamPerformanceAPIView.as_view(), name="dashboard-team-performance"),
]
