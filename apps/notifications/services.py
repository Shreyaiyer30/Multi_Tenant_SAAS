from django.utils import timezone

from apps.notifications.models import Notification
from apps.tenants.models import Membership


def notify_users(workspace, users, n_type, message, payload=None, actor=None):
    payload = payload or {}
    unique_users = {}
    for user in users or []:
        if user is not None:
            unique_users[user.id] = user

    notifications = [
        Notification(
            workspace=workspace,
            user=user,
            actor=actor,
            type=n_type,
            message=message,
            payload=payload,
            is_read=False,
            read_at=None,
        )
        for user in unique_users.values()
    ]
    if notifications:
        Notification.objects.bulk_create(notifications)
    return notifications


def notify_workspace_members(workspace, n_type, message, payload=None, actor=None, excluding_user=None):
    memberships = Membership.objects.select_related("user").filter(tenant=workspace)
    users = [m.user for m in memberships]
    if excluding_user:
        users = [user for user in users if user.id != excluding_user.id]
    return notify_users(workspace, users, n_type=n_type, message=message, payload=payload, actor=actor)


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

