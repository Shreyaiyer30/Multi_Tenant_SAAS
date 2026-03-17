from datetime import datetime, timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.audit.models import AuditLog
from apps.projects.models import Project
from apps.tasks.models import ActivityEvent, Task
from apps.tenants.models import Membership

RANGE_DAY_MAP = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
}


def resolve_range_days(raw_value):
    if raw_value is None:
        return "7d", 7
    value = str(raw_value).strip().lower()
    if value in RANGE_DAY_MAP:
        return value, RANGE_DAY_MAP[value]
    if value.isdigit():
        numeric = int(value)
        if numeric in RANGE_DAY_MAP.values():
            return f"{numeric}d", numeric
    return "7d", 7


def _range_window(days):
    end_date = timezone.localdate()
    start_date = end_date - timedelta(days=days - 1)
    start_dt = timezone.make_aware(
        datetime.combine(start_date, datetime.min.time())
    )
    end_dt = timezone.now()
    return start_date, end_date, start_dt, end_dt


def _aggregate_counts(queryset, field_name, expected_keys):
    counts = {key: 0 for key in expected_keys}
    rows = queryset.values(field_name).annotate(total=Count("id"))
    for row in rows:
        key = row[field_name]
        counts[key] = row["total"]
    return counts


def get_dashboard_overview(workspace):
    task_qs = Task.objects.filter(tenant=workspace)
    project_total = Project.objects.filter(tenant=workspace).count()

    status_keys = [value for value, _ in Task.Status.choices]
    priority_keys = [value for value, _ in Task.Priority.choices]

    return {
        "projects": {
            "total": project_total,
            "by_status": _aggregate_counts(task_qs, "status", status_keys),
            "by_priority": _aggregate_counts(task_qs, "priority", priority_keys),
        }
    }


def get_recent_activity(workspace, limit=10):
    activity = []

    audit_rows = (
        AuditLog.objects.filter(workspace=workspace, entity_type__in=["task", "project"])
        .select_related("actor")
        .order_by("-created_at")[: limit * 2]
    )
    for row in audit_rows:
        metadata = row.metadata or {}
        activity.append(
            {
                "actor": {
                    "id": row.actor_id if row.actor else None,
                    "name": row.actor.display_name if row.actor else "System",
                },
                "action": row.action,
                "task": {
                    "id": metadata.get("task_id") or row.entity_id,
                    "title": metadata.get("task_title", ""),
                },
                "project": {
                    "id": metadata.get("project_id") or (row.entity_id if row.entity_type == "project" else None),
                    "name": metadata.get("project_name", ""),
                },
                "comment": metadata.get("comment"),
                "created_at": row.created_at,
            }
        )

    comment_events = (
        ActivityEvent.objects.filter(
            tenant=workspace,
            event_type__in=[ActivityEvent.EventType.COMMENT_ADDED, ActivityEvent.EventType.COMMENT_DELETED],
        )
        .select_related("actor", "task")
        .order_by("-created_at")[:limit]
    )
    for event in comment_events:
        activity.append(
            {
                "actor": {
                    "id": event.actor_id if event.actor else None,
                    "name": event.actor.display_name if event.actor else "System",
                },
                "action": "TASK_COMMENTED"
                if event.event_type == ActivityEvent.EventType.COMMENT_ADDED
                else "TASK_COMMENT_DELETED",
                "task": {
                    "id": str(event.task_id),
                    "title": event.task.title if event.task else "",
                },
                "project": None,
                "comment": None,
                "created_at": event.created_at,
            }
        )

    activity.sort(key=lambda item: item["created_at"], reverse=True)
    return activity[:limit]


def get_tasks_trend(workspace, range_value="7d"):
    range_key, days = resolve_range_days(range_value)
    start_date, end_date, start_dt, end_dt = _range_window(days)

    rows = (
        Task.objects.filter(
            tenant=workspace,
            status=Task.Status.DONE,
            updated_at__gte=start_dt,
            updated_at__lte=end_dt,
        )
        .annotate(day=TruncDate("updated_at"))
        .values("day")
        .annotate(completed=Count("id"))
    )
    counts = {row["day"]: row["completed"] for row in rows}

    payload = []
    cursor = start_date
    while cursor <= end_date:
        payload.append(
            {
                "date": cursor.isoformat(),
                "label": cursor.strftime("%a") if days <= 7 else cursor.strftime("%b %d"),
                "full_date": cursor.strftime("%b %d, %Y"),
                "completed": int(counts.get(cursor, 0)),
            }
        )
        cursor += timedelta(days=1)
    return {"range": range_key, "results": payload}


def get_team_performance(workspace, range_value="7d"):
    range_key, days = resolve_range_days(range_value)
    _, _, start_dt, end_dt = _range_window(days)

    completed_rows = (
        Task.objects.filter(
            tenant=workspace,
            status=Task.Status.DONE,
            assignee__isnull=False,
            updated_at__gte=start_dt,
            updated_at__lte=end_dt,
        )
        .values("assignee")
        .annotate(completed=Count("id"))
    )
    completed_by_user_id = {str(row["assignee"]): int(row["completed"]) for row in completed_rows}

    members = Membership.objects.filter(tenant=workspace).select_related("user")
    results = []
    for membership in members:
        user = membership.user
        user_id = str(user.id)
        completed = completed_by_user_id.get(user_id, 0)
        if completed <= 0:
            continue
        results.append(
            {
                "member_id": user_id,
                "name": user.display_name,
                "completed": completed,
            }
        )

    results.sort(key=lambda item: item["completed"], reverse=True)
    return {"range": range_key, "results": results}
