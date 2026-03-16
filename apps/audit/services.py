from apps.audit.models import AuditLog


def log_event(workspace, actor, action, entity=None, metadata=None):
    metadata = metadata or {}
    entity_type = metadata.get("entity_type", "task")
    entity_id = None

    if entity is not None:
        entity_type = getattr(entity._meta, "model_name", entity_type)
        entity_id = str(getattr(entity, "pk", None) or "")

    if entity_id == "":
        entity_id = None

    try:
        return AuditLog.objects.create(
            workspace=workspace,
            actor=actor,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata,
        )
    except Exception:
        # Do not fail core task flows if audit storage is temporarily unavailable.
        return None
