import uuid

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
        old = Task.objects.get(pk=instance.pk)
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
        events.append((ActivityEvent.EventType.ASSIGNEE_CHANGED, {"from": old.assignee_id, "to": instance.assignee_id}))
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
def comment_deleted_activity(sender, instance, **kwargs):
    ActivityEvent.objects.create(
        id=uuid.uuid4(),
        tenant=instance.tenant,
        task=instance.task,
        actor=instance.author,
        event_type=ActivityEvent.EventType.COMMENT_DELETED,
        data={"comment_id": str(instance.id)},
    )
