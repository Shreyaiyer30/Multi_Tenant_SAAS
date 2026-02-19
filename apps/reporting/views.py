import csv
from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantAdminOrOwner, ProPlanRequired
from apps.tasks.models import Task


class ReportingStatsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrOwner, ProPlanRequired]

    def get(self, request):
        range_key = request.query_params.get("range", "week")
        days = {"week": 7, "month": 30, "quarter": 90}.get(range_key, 7)
        since = timezone.now() - timedelta(days=days)
        tasks = Task.objects.filter(tenant=request.tenant)

        created = tasks.filter(created_at__gte=since).count()
        completed = tasks.filter(status=Task.Status.DONE, updated_at__gte=since).count()
        overdue = tasks.filter(due_date__lt=timezone.localdate()).exclude(status=Task.Status.DONE).count()
        completion_rate = round((completed / created) * 100, 2) if created else 0.0

        return Response(
            {
                "range": range_key,
                "tasks_created": created,
                "tasks_completed": completed,
                "tasks_overdue": overdue,
                "completion_rate": completion_rate,
                "completed_by_week": [],
                "member_productivity": [],
            }
        )


class ReportingExportCSVAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrOwner, ProPlanRequired]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="tasks_export.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "Task ID",
            "Title",
            "Project",
            "Status",
            "Priority",
            "Assignee",
            "Due Date",
            "Created By",
            "Created At",
            "Updated At",
        ])
        for t in Task.objects.filter(tenant=request.tenant).select_related("project", "assignee", "created_by"):
            writer.writerow([
                t.id,
                t.title,
                t.project.name,
                t.status,
                t.priority,
                t.assignee.display_name if t.assignee else "",
                t.due_date,
                t.created_by.display_name,
                t.created_at,
                t.updated_at,
            ])
        return response


class ReportingExportPDFAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantAdminOrOwner, ProPlanRequired]

    def get(self, request):
        # Placeholder PDF-like response body for Phase 9 wiring.
        content = f"Task report for {request.tenant.name} generated at {timezone.now().isoformat()}"
        response = HttpResponse(content, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="tasks_report.pdf"'
        return response
