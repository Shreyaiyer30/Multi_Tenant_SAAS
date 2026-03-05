from django.db.models import Count

from apps.audit.models import AuditLog
from apps.projects.models import Project
from apps.tasks.models import ActivityEvent, Task


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
