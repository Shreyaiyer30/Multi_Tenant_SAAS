from django.utils import timezone
from rest_framework import serializers

from apps.projects.models import ProjectMember
from apps.tasks.models import ActivityEvent, Comment, Notification, Task
from apps.tenants.models import Membership


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_by",
            "assignee",
            "progress_percent",
            "position",
            "is_overdue",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "position", "is_overdue", "created_at", "updated_at")

    def validate_project(self, value):
        tenant = self.context["request"].tenant
        if value.tenant_id != tenant.id:
            raise serializers.ValidationError("Project must belong to the selected workspace.")
        return value

    def validate_assignee(self, value):
        if value is None:
            return value
        request = self.context["request"]
        tenant = request.tenant
        if not Membership.objects.filter(tenant=tenant, user=value).exists():
            raise serializers.ValidationError("Assignee must be a member of the selected workspace.")

        project_id = self.initial_data.get("project") or getattr(getattr(self, "instance", None), "project_id", None)
        if project_id:
            if not ProjectMember.objects.filter(project_id=project_id, tenant=tenant, user=value).exists():
                raise serializers.ValidationError("Assignee must be a member of this project.")
        return value

    def create(self, validated_data):
        tenant = self.context["request"].tenant
        project = validated_data["project"]
        status_val = validated_data.get("status", Task.Status.TODO)
        max_pos = Task.objects.filter(tenant=tenant, project=project, status=status_val).order_by("-position").values_list("position", flat=True).first()
        validated_data["position"] = 0 if max_pos is None else max_pos + 1
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ("id", "author", "body", "mentions", "edited", "created_at", "updated_at")
        read_only_fields = ("id", "author", "edited", "created_at", "updated_at")

    def get_author(self, obj):
        return {
            "id": obj.author.id,
            "display_name": obj.author.display_name,
            "avatar_url": obj.author.avatar_url,
        }


class ActivitySerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = ("id", "actor", "event_type", "data", "created_at")

    def get_actor(self, obj):
        return {
            "id": obj.actor.id,
            "display_name": obj.actor.display_name,
            "avatar_url": obj.actor.avatar_url,
        }


class NotificationSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "actor", "event_type", "type", "body", "payload", "task", "is_read", "read_at", "created_at")

    def get_actor(self, obj):
        if not obj.actor:
            return None
        return {"display_name": obj.actor.display_name, "avatar_url": obj.actor.avatar_url}

    def get_task(self, obj):
        if not obj.task:
            return None
        return {
            "id": obj.task.id,
            "title": obj.task.title,
            "project_id": obj.task.project_id,
            "workspace_slug": obj.task.tenant.slug,
        }
