from django.urls import path

from apps.dashboard.views import DashboardOverviewAPIView, DashboardRecentActivityAPIView

urlpatterns = [
    path("dashboard/overview/", DashboardOverviewAPIView.as_view(), name="dashboard-overview"),
    path("dashboard/recent-activity/", DashboardRecentActivityAPIView.as_view(), name="dashboard-recent-activity"),
]

