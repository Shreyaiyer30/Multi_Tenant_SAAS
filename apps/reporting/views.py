import csv
from datetime import timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantAdminOrOwner, ProPlanRequired
from apps.tasks.models import Task


def _escape_pdf_text(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_simple_pdf(lines: list[str]) -> bytes:
    """Generate a minimal valid PDF document without external dependencies."""
    content_ops = ["BT", "/F1 11 Tf", "50 790 Td"]

    for index, line in enumerate(lines):
        if index > 0:
            content_ops.append("0 -16 Td")
        content_ops.append(f"({_escape_pdf_text(line)}) Tj")

    content_ops.append("ET")
    content_stream = "\n".join(content_ops).encode("latin-1", errors="replace")

    objects = [
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(content_stream)} >>\nstream\n".encode("ascii") + content_stream + b"\nendstream\nendobj\n",
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]

    pdf = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj

    xref_start = len(pdf)
    pdf += f"xref\n0 {len(offsets)}\n".encode("ascii")
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode("ascii")

    pdf += (
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return pdf


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
        tasks = Task.objects.filter(tenant=request.tenant).select_related("project", "assignee", "created_by")
        now = timezone.now()
        lines = [
            f"Task Report - {request.tenant.name}",
            f"Generated: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}",
            "",
            f"Total tasks: {tasks.count()}",
            f"Completed: {tasks.filter(status=Task.Status.DONE).count()}",
            f"Overdue: {tasks.filter(due_date__lt=timezone.localdate()).exclude(status=Task.Status.DONE).count()}",
            "",
            "Recent tasks:",
        ]

        for task in tasks.order_by("-updated_at")[:20]:
            assignee = task.assignee.display_name if task.assignee else "Unassigned"
            due = task.due_date.isoformat() if task.due_date else "-"
            lines.append(
                f"- {task.title[:60]} | {task.status} | {task.priority} | {assignee[:20]} | due {due}"
            )

        pdf_bytes = _build_simple_pdf(lines)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = 'attachment; filename="tasks_report.pdf"'
        return response
