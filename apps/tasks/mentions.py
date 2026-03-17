import re

from django.contrib.auth import get_user_model

from apps.tenants.models import Membership

MENTION_PATTERN = re.compile(r"@(\w+)")


def _normalize_handle(value):
    if value is None:
        return ""
    cleaned = re.sub(r"[^a-z0-9_]+", "_", str(value).strip().lower())
    return cleaned.strip("_")


def _candidate_handles(user):
    email = getattr(user, "email", "") or ""
    email_local = email.split("@", 1)[0] if email else ""

    candidates = [
        getattr(user, "display_name", ""),
        getattr(user, "first_name", ""),
        f"{getattr(user, 'first_name', '')}{getattr(user, 'last_name', '')}",
        email_local,
    ]

    handles = []
    seen = set()
    for raw in candidates:
        handle = _normalize_handle(raw)
        if not handle or handle in seen:
            continue
        seen.add(handle)
        handles.append(handle)
    return handles


def _workspace_handle_lookup(workspace):
    lookup = {}
    collisions = set()
    memberships = Membership.objects.filter(tenant=workspace).select_related("user")

    for membership in memberships:
        user = membership.user
        for handle in _candidate_handles(user):
            current = lookup.get(handle)
            if current and current.id != user.id:
                collisions.add(handle)
                lookup.pop(handle, None)
                continue
            if handle not in collisions:
                lookup[handle] = user
    return lookup


def resolve_mentioned_users(workspace, comment_text, explicit_user_ids=None):
    explicit_user_ids = explicit_user_ids if isinstance(explicit_user_ids, list) else []

    ordered_ids = []
    seen = set()

    handle_lookup = _workspace_handle_lookup(workspace)
    for handle in MENTION_PATTERN.findall(comment_text or ""):
        user = handle_lookup.get(_normalize_handle(handle))
        if user and user.id not in seen:
            seen.add(user.id)
            ordered_ids.append(user.id)

    if explicit_user_ids:
        explicit_members = Membership.objects.filter(tenant=workspace, user_id__in=explicit_user_ids)
        for user_id in explicit_members.values_list("user_id", flat=True):
            if user_id not in seen:
                seen.add(user_id)
                ordered_ids.append(user_id)

    if not ordered_ids:
        return []

    users = get_user_model().objects.filter(id__in=ordered_ids)
    users_by_id = {row.id: row for row in users}
    return [users_by_id[row_id] for row_id in ordered_ids if row_id in users_by_id]
