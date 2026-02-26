from django.db.models import Count, Q
from rest_framework import serializers

from apps.projects.models import Project, ProjectMember


class ProjectSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    task_counts = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "color",
            "status",
            "completion_percent",
            "started_at",
            "completed_at",
            "created_by",
            "task_counts",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "task_counts", "created_at", "updated_at", "completed_at")

    def get_created_by(self, obj):
        return {
            "id": obj.created_by.id,
            "display_name": obj.created_by.display_name,
            "avatar_url": obj.created_by.avatar_url,
        }

    def get_task_counts(self, obj):
        agg = obj.tasks.aggregate(
            todo=Count("id", filter=Q(status="todo")),
            in_progress=Count("id", filter=Q(status="in_progress")),
            in_review=Count("id", filter=Q(status="in_review")),
            done=Count("id", filter=Q(status="done")),
            total=Count("id"),
        )
        return agg


class ProjectMemberSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    added_by = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = ("id", "user", "role", "added_by", "created_at", "updated_at")
        read_only_fields = ("id", "added_by", "created_at", "updated_at")

    def get_user(self, obj):
        return {
            "id": obj.user.id,
            "email": obj.user.email,
            "display_name": obj.user.display_name,
            "avatar_url": obj.user.avatar_url,
        }

    def get_added_by(self, obj):
        if not obj.added_by:
            return None
        return {
            "id": obj.added_by.id,
            "display_name": obj.added_by.display_name,
        }
