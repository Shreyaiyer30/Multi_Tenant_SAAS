from django.db.models import Count, Q
from rest_framework import serializers

from apps.projects.models import Project


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
            "created_by",
            "task_counts",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "task_counts", "created_at", "updated_at")

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
