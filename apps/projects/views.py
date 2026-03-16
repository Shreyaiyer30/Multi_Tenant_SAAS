from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.audit.models import AuditLog
from apps.audit.services import log_event
from apps.common.mixins import TenantScopedQuerysetMixin
from apps.common.permissions import IsTenantAdminOrOwner, IsTenantMember, IsTenantOwner, PlanLimitPermission
from apps.projects.models import Project, ProjectMember
from apps.projects.serializers import ProjectMemberSerializer, ProjectSerializer
from apps.tenants.models import Membership


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
        ProjectMember.objects.get_or_create(
            tenant=self.request.tenant,
            project=serializer.instance,
            user=self.request.user,
            defaults={"role": ProjectMember.Role.ADMIN, "added_by": self.request.user},
        )
        log_event(
            self.request.tenant,
            self.request.user,
            AuditLog.Action.PROJECT_CREATED,
            entity=serializer.instance,
            metadata={
                "entity_type": "project",
                "project_id": str(serializer.instance.id),
                "project_name": serializer.instance.name,
            },
        )

    def perform_update(self, serializer):
        serializer.save()
        project = serializer.instance
        log_event(
            self.request.tenant,
            self.request.user,
            AuditLog.Action.PROJECT_UPDATED,
            entity=project,
            metadata={
                "entity_type": "project",
                "project_id": str(project.id),
                "project_name": project.name,
            },
        )

    def perform_destroy(self, instance):
        project_id = str(instance.id)
        project_name = instance.name
        log_event(
            self.request.tenant,
            self.request.user,
            AuditLog.Action.PROJECT_DELETED,
            entity=instance,
            metadata={
                "entity_type": "project",
                "project_id": project_id,
                "project_name": project_name,
            },
        )
        instance.delete()

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        qp = self.request.query_params

        if qp.get("status"):
            queryset = queryset.filter(status__in=qp["status"].split(","))
        if qp.get("created_by"):
            queryset = queryset.filter(created_by_id=qp["created_by"])
        if qp.get("member"):
            queryset = queryset.filter(members__user_id=qp["member"])
        if qp.get("search"):
            query = qp["search"].strip()
            queryset = queryset.filter(Q(name__icontains=query) | Q(description__icontains=query))
        if qp.get("created_after"):
            queryset = queryset.filter(created_at__date__gte=qp["created_after"])
        if qp.get("created_before"):
            queryset = queryset.filter(created_at__date__lte=qp["created_before"])

        ordering = qp.get("ordering")
        allowed = {"created_at", "updated_at", "name", "status", "completion_percent"}
        if ordering:
            field = ordering.lstrip("-")
            if field in allowed:
                queryset = queryset.order_by(ordering)

        return queryset.distinct()

    @action(detail=True, methods=["get"])
    def board(self, request, pk=None):
        project = self.get_object()
        columns = {"todo": [], "in_progress": [], "in_review": [], "done": []}
        for task in project.tasks.select_related("assignee", "created_by").order_by("status", "position", "created_at"):
            columns[task.status].append(
                {
                    "id": task.id,
                    "project": project.id,
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
        return Response({
            "project_id": project.id,
            "task_counts": result,
            "progress_percent": project.completion_percent
        })

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        project = self.get_object()
        if request.method == "GET":
            queryset = project.members.select_related("user")
            return Response(ProjectMemberSerializer(queryset, many=True).data)

        if not request.membership or request.membership.role not in {Membership.Role.ADMIN, Membership.Role.OWNER}:
            return Response({"error": "error", "detail": {"detail": "Only admin or owner can manage project members."}}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get("user_id")
        role = request.data.get("role", ProjectMember.Role.MEMBER)
        if not user_id:
            return Response({"error": "validation_error", "detail": {"user_id": ["This field is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        if not Membership.objects.filter(tenant=request.tenant, user_id=user_id).exists():
            return Response({"error": "validation_error", "detail": {"user_id": ["User must be a workspace member."]}}, status=status.HTTP_400_BAD_REQUEST)

        obj, _ = ProjectMember.objects.get_or_create(
            tenant=request.tenant,
            project=project,
            user_id=user_id,
            defaults={"role": role, "added_by": request.user},
        )
        if obj.role != role:
            obj.role = role
            obj.save(update_fields=["role", "updated_at"])
        log_event(
            request.tenant,
            request.user,
            AuditLog.Action.PROJECT_MEMBER_ADDED,
            entity=project,
            metadata={
                "entity_type": "project",
                "project_id": str(project.id),
                "project_name": project.name,
                "member_user_id": str(user_id),
            },
        )

        return Response(ProjectMemberSerializer(obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="members/(?P<user_id>[^/.]+)")
    def remove_member(self, request, pk=None, user_id=None):
        project = self.get_object()
        if not request.membership or request.membership.role not in {Membership.Role.ADMIN, Membership.Role.OWNER}:
            # Also check if they are project admin
            pm = project.members.filter(user=request.user, tenant=request.tenant).first()
            if not pm or pm.role != ProjectMember.Role.ADMIN:
                return Response({"error": "error", "detail": {"detail": "Only admin or owner can manage project members."}}, status=status.HTTP_403_FORBIDDEN)
        
        deleted = project.members.filter(user_id=user_id, tenant=request.tenant).delete()[0]
        if not deleted:
            return Response({"error": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        log_event(
            request.tenant,
            request.user,
            AuditLog.Action.PROJECT_MEMBER_REMOVED,
            entity=project,
            metadata={
                "entity_type": "project",
                "project_id": str(project.id),
                "project_name": project.name,
                "member_user_id": str(user_id),
            },
        )
        
        # Unassign tasks
        project.tasks.filter(assignee_id=user_id).update(assignee=None, updated_at=timezone.now())
        
        return Response(status=status.HTTP_204_NO_CONTENT)
