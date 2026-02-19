from django.db.models import Count
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.common.mixins import TenantScopedQuerysetMixin
from apps.common.permissions import IsTenantAdminOrOwner, IsTenantMember, IsTenantOwner, PlanLimitPermission
from apps.projects.models import Project
from apps.projects.serializers import ProjectSerializer


class ProjectViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Project.objects.select_related("created_by", "tenant").all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]
    plan_limit_key = "projects"

    def get_permissions(self):
        if self.action in {"create"}:
            permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner, PlanLimitPermission]
        elif self.action in {"update", "partial_update", "stats"}:
            permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantAdminOrOwner]
        elif self.action in {"destroy"}:
            permission_classes = [permissions.IsAuthenticated, IsTenantMember, IsTenantOwner]
        else:
            permission_classes = [permissions.IsAuthenticated, IsTenantMember]
        return [perm() for perm in permission_classes]

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["get"])
    def board(self, request, pk=None):
        project = self.get_object()
        columns = {"todo": [], "in_progress": [], "in_review": [], "done": []}
        for task in project.tasks.select_related("assignee", "created_by").order_by("status", "position", "created_at"):
            columns[task.status].append(
                {
                    "id": task.id,
                    "title": task.title,
                    "priority": task.priority,
                    "assignee": task.assignee_id,
                    "position": task.position,
                }
            )
        return Response(
            {
                "project": {"id": project.id, "name": project.name, "color": project.color},
                "columns": columns,
            }
        )

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        project = self.get_object()
        counts = project.tasks.values("status").annotate(total=Count("id"))
        result = {row["status"]: row["total"] for row in counts}
        return Response({"project_id": project.id, "task_counts": result})
