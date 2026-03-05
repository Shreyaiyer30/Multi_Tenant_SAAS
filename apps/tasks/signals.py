import uuid

from django.db import IntegrityError
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.tasks.models import ActivityEvent, Comment, Task


@receiver(post_save, sender=Task)
def task_created_activity(sender, instance, created, **kwargs):
    if created:
        ActivityEvent.objects.create(
            id=uuid.uuid4(),
            tenant=instance.tenant,
            task=instance,
            actor=instance.created_by,
            event_type=ActivityEvent.EventType.TASK_CREATED,
            data={},
        )


@receiver(pre_save, sender=Task)
def track_task_changes(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = Task.objects.get(pk=instance.pk, tenant_id=instance.tenant_id)
    except Task.DoesNotExist:
        return

    events = []
    if old.title != instance.title:
        events.append((ActivityEvent.EventType.TITLE_CHANGED, {"from": old.title, "to": instance.title}))
    if old.description != instance.description:
        events.append((ActivityEvent.EventType.DESCRIPTION_CHANGED, {}))
    if old.status != instance.status:
        events.append((ActivityEvent.EventType.STATUS_CHANGED, {"from": old.status, "to": instance.status}))
    if old.priority != instance.priority:
        events.append((ActivityEvent.EventType.PRIORITY_CHANGED, {"from": old.priority, "to": instance.priority}))
    if old.assignee_id != instance.assignee_id:
        events.append(
            (
                ActivityEvent.EventType.ASSIGNEE_CHANGED,
                {
                    "from": str(old.assignee_id) if old.assignee_id else None,
                    "to": str(instance.assignee_id) if instance.assignee_id else None,
                },
            )
        )
    if old.due_date != instance.due_date:
        events.append((ActivityEvent.EventType.DUE_DATE_CHANGED, {"from": str(old.due_date) if old.due_date else None, "to": str(instance.due_date) if instance.due_date else None}))

    if events:
        instance._activity_events = events


@receiver(post_save, sender=Task)
def emit_task_change_activity(sender, instance, created, **kwargs):
    if created:
        return
    events = getattr(instance, "_activity_events", [])
    for event_type, data in events:
        ActivityEvent.objects.create(
            id=uuid.uuid4(),
            tenant=instance.tenant,
            task=instance,
            actor=instance.created_by,
            event_type=event_type,
            data=data,
        )


@receiver(post_save, sender=Comment)
def comment_added_activity(sender, instance, created, **kwargs):
    if created:
        ActivityEvent.objects.create(
            id=uuid.uuid4(),
            tenant=instance.tenant,
            task=instance.task,
            actor=instance.author,
            event_type=ActivityEvent.EventType.COMMENT_ADDED,
            data={"comment_id": str(instance.id)},
        )


@receiver(post_delete, sender=Comment)
def comment_deleted_activity(sender, instance, origin=None, **kwargs):
    # Only record explicit comment deletions; skip cascade deletes from task/project removal.
    if origin is not None:
        origin_model = getattr(origin, "model", None)
        if origin_model is None and getattr(origin, "_meta", None) is not None:
            origin_model = origin._meta.model
        if origin_model is not None and origin_model is not Comment:
            return

    task_id = instance.task_id
    if not task_id or not Task.objects.filter(id=task_id, tenant_id=instance.tenant_id).exists():
        return
    try:
        ActivityEvent.objects.create(
            id=uuid.uuid4(),
            tenant_id=instance.tenant_id,
            task_id=task_id,
            actor_id=instance.author_id,
            event_type=ActivityEvent.EventType.COMMENT_DELETED,
            data={"comment_id": str(instance.id)},
        )
    except IntegrityError:
        # During task/project cascade deletes, the task row can disappear before this signal inserts.
        return
