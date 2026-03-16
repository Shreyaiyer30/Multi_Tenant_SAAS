from django.utils import timezone

from apps.notifications.models import Notification
from apps.tenants.models import Membership


def _user_id(value):
    if value is None:
        return None
    return getattr(value, "id", value)


def notify_users(workspace, users, n_type, message, payload=None, actor=None):
    payload = payload or {}
    unique_user_ids = {_user_id(user) for user in (users or []) if _user_id(user) is not None}

    notifications = [
        Notification(
            workspace=workspace,
            user_id=user_id,
            actor=actor,
            type=n_type,
            message=message,
            payload=payload,
            is_read=False,
            read_at=None,
        )
        for user_id in unique_user_ids
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)
    return notifications


def notify_workspace_members(workspace, n_type, message, payload=None, actor=None, excluding_user=None):
    excluded_id = _user_id(excluding_user)
    user_ids = Membership.objects.filter(tenant=workspace).values_list("user_id", flat=True)
    if excluded_id:
        user_ids = user_ids.exclude(user_id=excluded_id)
    return notify_users(workspace, user_ids, n_type=n_type, message=message, payload=payload, actor=actor)


def notify_assignee(workspace, assignee, n_type, message, payload=None, actor=None):
    if assignee is None:
        return []
    return notify_users(workspace, [assignee], n_type=n_type, message=message, payload=payload, actor=actor)


def mark_notifications_read(workspace, user, ids=None):
    queryset = Notification.objects.filter(workspace=workspace, user=user)
    if ids:
        queryset = queryset.filter(id__in=ids)
    return queryset.update(is_read=True, read_at=timezone.now())


def mark_all_read(workspace, user):
    return Notification.objects.filter(workspace=workspace, user=user, is_read=False).update(
        is_read=True,
        read_at=timezone.now(),
    )
