from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("tenants", "0006_workspaceinvite_billingwebhookevent"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("TASK_CREATED", "Task Created"),
                            ("TASK_UPDATED", "Task Updated"),
                            ("TASK_DELETED", "Task Deleted"),
                            ("TASK_ASSIGNED", "Task Assigned"),
                            ("TASK_UNASSIGNED", "Task Unassigned"),
                            ("TASK_STATUS_CHANGED", "Task Status Changed"),
                        ],
                        max_length=64,
                    ),
                ),
                ("entity_type", models.CharField(default="task", max_length=64)),
                ("entity_id", models.CharField(blank=True, max_length=64, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="audit_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="audit_logs",
                        to="tenants.tenant",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["workspace", "created_at"], name="audit_audit_workspa_3f53d5_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["workspace", "action"], name="audit_audit_workspa_f657de_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["workspace", "entity_type", "created_at"], name="audit_audit_workspa_0f03fd_idx"),
        ),
    ]

