from dataclasses import dataclass

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.notifications.services import notify_assignee, notify_workspace_members
from apps.projects.models import ProjectMember
from apps.projects.services import ProjectService
from apps.tasks.models import Notification, Task, TaskActivity
from apps.tenants.models import Membership


@dataclass
class TaskUpdateResult:
    task: Task
    changed_fields: list[str]


class NotificationService:
    @staticmethod
    def enqueue(*, tenant, recipient, actor, n_type, task=None, body="", payload=None):
        if not recipient:
            return None
        return Notification.objects.create(
            tenant=tenant,
            recipient=recipient,
            actor=actor,
            task=task,
            type=n_type,
            event_type=n_type,
            body=body,
            payload=payload or {},
            is_read=False,
            read_at=None,
        )


class AutoAssignmentService:
    PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3}

    @classmethod
    def _sort_key(cls, task: Task):
        due = task.due_date.isoformat() if task.due_date else "9999-12-31"
        return (cls.PRIORITY_ORDER.get(task.priority, 9), due, task.created_at.isoformat())

    @classmethod
    def assign_next(cls, *, task: Task, actor):
        project = task.project
        if project.status == project.Status.COMPLETED:
            return None

        candidates = list(
            Task.objects.filter(
                tenant=task.tenant,
                project=project,
                assignee__isnull=True,
                status__in=[Task.Status.TODO, Task.Status.IN_PROGRESS, Task.Status.IN_REVIEW],
            ).exclude(id=task.id)
        )
        if not candidates:
            return None

        next_task = sorted(candidates, key=cls._sort_key)[0]
        next_task.assignee = task.assignee
        next_task.save(update_fields=["assignee", "updated_at"])

        TaskActivity.objects.create(
            tenant=task.tenant,
            task=next_task,
            actor=actor,
            event_type="auto_assigned",
            old_values={"assignee_id": None},
            new_values={"assignee_id": str(task.assignee_id)},
        )
        NotificationService.enqueue(
            tenant=task.tenant,
            recipient=task.assignee,
            actor=actor,
            task=next_task,
            n_type="task_auto_assigned",
            body=f"You were auto-assigned task '{next_task.title}'.",
            payload={"task_id": str(next_task.id), "project_id": str(project.id)},
        )
        return next_task


class TaskService:
    TRACKED_FIELDS = {"status", "progress_percent", "assignee", "title", "description", "priority", "due_date"}

    @staticmethod
    def _validate_assignee_in_project(*, request, task: Task, assignee):
        if assignee is None:
            return
        # Ensure user is a workspace member
        if not Membership.objects.filter(tenant=request.tenant, user=assignee).exists():
            raise ValidationError({"assignee": ["Assignee must be a workspace member."]}, code="invalid_assignee")

        # Must be a project member
        if not ProjectMember.objects.filter(project=task.project, tenant=request.tenant, user=assignee).exists():
            raise ValidationError({"assignee": ["Assignee must be a project member."]}, code="invalid_assignee")

    @classmethod
    @transaction.atomic
    def update_task(cls, *, request, task: Task, validated_data: dict, actor, auto_assign=True):
        old = {k: getattr(task, k) for k in cls.TRACKED_FIELDS}
        changed = []

        assignee = validated_data.get("assignee", task.assignee)
        cls._validate_assignee_in_project(request=request, task=task, assignee=assignee)

        for field, value in validated_data.items():
            if getattr(task, field) != value:
                setattr(task, field, value)
                if field in cls.TRACKED_FIELDS:
                    changed.append(field)

        # Progress logic: 100% if done, 0% otherwise
        if task.status == Task.Status.DONE:
            if task.progress_percent != 100:
                task.progress_percent = 100
                if "progress_percent" not in changed:
                    changed.append("progress_percent")
        else:
            if task.progress_percent != 0:
                task.progress_percent = 0
                if "progress_percent" not in changed:
                    changed.append("progress_percent")

        task.save()

        if changed:
            old_values = {}
            new_values = {}
            for field in changed:
                old_val = old.get(field)
                new_val = getattr(task, field)
                old_values[field] = str(old_val) if old_val is not None else None
                new_values[field] = str(new_val) if new_val is not None else None

            TaskActivity.objects.create(
                tenant=request.tenant,
                task=task,
                actor=actor,
                event_type="task_updated",
                old_values=old_values,
                new_values=new_values,
            )
            log_event(
                request.tenant,
                actor,
                AuditLog.Action.TASK_UPDATED,
                entity=task,
                metadata={
                    "task_id": str(task.id),
                    "task_title": task.title,
                    "changed_fields": changed,
                },
            )
            notify_workspace_members(
                request.tenant,
                n_type="task_updated",
                message=f"Task '{task.title}' was updated.",
                payload={"task_id": str(task.id), "project_id": str(task.project_id)},
                actor=actor,
                excluding_user=actor,
            )

            old_assignee = old.get("assignee")
            if "assignee" in changed:
                if old_assignee and old_assignee != task.assignee:
                    log_event(
                        request.tenant,
                        actor,
                        AuditLog.Action.TASK_UNASSIGNED,
                        entity=task,
                        metadata={
                            "task_id": str(task.id),
                            "task_title": task.title,
                            "assignee_id": str(old_assignee.id),
                        },
                    )
                    NotificationService.enqueue(
                        tenant=request.tenant,
                        recipient=old_assignee,
                        actor=actor,
                        task=task,
                        n_type="task_unassigned",
                        body=f"You were unassigned from '{task.title}'.",
                        payload={"task_id": str(task.id)},
                    )
                    notify_assignee(
                        request.tenant,
                        old_assignee,
                        n_type="task_unassigned",
                        message=f"You were unassigned from '{task.title}'.",
                        payload={"task_id": str(task.id), "project_id": str(task.project_id)},
                        actor=actor,
                    )
                if task.assignee and old_assignee != task.assignee:
                    log_event(
                        request.tenant,
                        actor,
                        AuditLog.Action.TASK_ASSIGNED,
                        entity=task,
                        metadata={
                            "task_id": str(task.id),
                            "task_title": task.title,
                            "assignee_id": str(task.assignee.id),
                        },
                    )
                    NotificationService.enqueue(
                        tenant=request.tenant,
                        recipient=task.assignee,
                        actor=actor,
                        task=task,
                        n_type="task_assigned",
                        body=f"You were assigned '{task.title}'.",
                        payload={"task_id": str(task.id)},
                    )
                    notify_assignee(
                        request.tenant,
                        task.assignee,
                        n_type="task_assigned",
                        message=f"You were assigned '{task.title}'.",
                        payload={"task_id": str(task.id), "project_id": str(task.project_id)},
                        actor=actor,
                    )

            if "status" in changed:
                log_event(
                    request.tenant,
                    actor,
                    AuditLog.Action.TASK_STATUS_CHANGED,
                    entity=task,
                    metadata={
                        "task_id": str(task.id),
                        "task_title": task.title,
                        "old_status": old_values.get("status"),
                        "new_status": new_values.get("status"),
                    },
                )
                notify_assignee(
                    request.tenant,
                    task.assignee,
                    n_type="task_status_changed",
                    message=f"Status changed for '{task.title}' to '{task.status}'.",
                    payload={"task_id": str(task.id), "project_id": str(task.project_id), "status": task.status},
                    actor=actor,
                )

            if "status" in changed and task.status == Task.Status.DONE:
                for pm in ProjectMember.objects.filter(project=task.project, tenant=request.tenant).select_related("user"):
                    NotificationService.enqueue(
                        tenant=request.tenant,
                        recipient=pm.user,
                        actor=actor,
                        task=task,
                        n_type="task_completed",
                        body=f"Task '{task.title}' was completed.",
                        payload={"task_id": str(task.id), "project_id": str(task.project_id)},
                    )
                if auto_assign and task.assignee:
                    AutoAssignmentService.assign_next(task=task, actor=actor)

        ProjectService.recompute_completion(task.project)
        return TaskUpdateResult(task=task, changed_fields=changed)

    @staticmethod
    @transaction.atomic
    def create_task(*, request, serializer, actor):
        project = serializer.validated_data["project"]
        if project.tenant_id != request.tenant.id:
            raise ValidationError({"project": ["Project does not belong to this workspace."]})
        
        assignee = serializer.validated_data.get("assignee")
        TaskService._validate_assignee_in_project(request=request, task=Task(project=project), assignee=assignee)

        serializer.save(tenant=request.tenant, created_by=actor)
        task = serializer.instance
        TaskActivity.objects.create(
            tenant=request.tenant,
            task=task,
            actor=actor,
            event_type="task_created",
            old_values={},
            new_values={"status": task.status, "assignee": str(task.assignee_id) if task.assignee_id else None},
        )
        log_event(
            request.tenant,
            actor,
            AuditLog.Action.TASK_CREATED,
            entity=task,
            metadata={"task_id": str(task.id), "task_title": task.title, "status": task.status},
        )
        notify_workspace_members(
            request.tenant,
            n_type="task_created",
            message=f"Task '{task.title}' was created.",
            payload={"task_id": str(task.id), "project_id": str(task.project_id)},
            actor=actor,
            excluding_user=actor,
        )
        notify_assignee(
            request.tenant,
            task.assignee,
            n_type="task_assigned",
            message=f"You were assigned '{task.title}'.",
            payload={"task_id": str(task.id), "project_id": str(task.project_id)},
            actor=actor,
        )
        ProjectService.recompute_completion(task.project)
        return task

    @staticmethod
    @transaction.atomic
    def delete_task(*, request, task: Task, actor):
        task_id = str(task.id)
        task_title = task.title
        project_id = str(task.project_id)
        task_assignee = task.assignee

        log_event(
            request.tenant,
            actor,
            AuditLog.Action.TASK_DELETED,
            entity=task,
            metadata={"task_id": task_id, "task_title": task_title},
        )
        notify_workspace_members(
            request.tenant,
            n_type="task_deleted",
            message=f"Task '{task_title}' was deleted.",
            payload={"task_id": task_id, "project_id": project_id},
            actor=actor,
            excluding_user=actor,
        )
        notify_assignee(
            request.tenant,
            task_assignee,
            n_type="task_unassigned",
            message=f"Task '{task_title}' was deleted.",
            payload={"task_id": task_id, "project_id": project_id},
            actor=actor,
        )

        project = task.project
        task.delete()
        ProjectService.recompute_completion(project)
