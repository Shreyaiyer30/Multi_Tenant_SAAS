from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantMember
from apps.dashboard.services import (
    get_dashboard_stats,
    get_dashboard_overview,
    get_recent_activity,
    get_tasks_comparison,
    get_tasks_trend,
    get_team_performance,
)


class DashboardOverviewAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        return Response(get_dashboard_overview(workspace))


class DashboardRecentActivityAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        try:
            limit = int(request.query_params.get("limit", 5))
        except (TypeError, ValueError):
            limit = 5
        limit = max(1, min(limit, 50))
        return Response(get_recent_activity(workspace, limit=limit))


class DashboardTasksTrendAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        range_value = request.query_params.get("range", "7d")
        return Response(get_tasks_trend(workspace, range_value=range_value))


class DashboardStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        range_value = request.query_params.get("range", "7d")
        return Response(get_dashboard_stats(workspace, range_value=range_value))


class DashboardTasksComparisonAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        range_value = request.query_params.get("range", "7d")
        return Response(get_tasks_comparison(workspace, range_value=range_value))


class DashboardTeamPerformanceAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        range_value = request.query_params.get("range", "7d")
        return Response(get_team_performance(workspace, range_value=range_value))
