from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import TenantScopedQuerysetMixin
from apps.common.permissions import IsResourceOwnerOrTenantAdmin, IsTenantMember
from apps.tasks.models import ActivityEvent, Comment, Notification, Task
from apps.tasks.serializers import ActivitySerializer, CommentSerializer, NotificationSerializer, TaskSerializer


class TaskViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related("project", "created_by", "assignee", "tenant").all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get_permissions(self):
        if self.action in {"update", "partial_update", "destroy", "move"}:
            return [permissions.IsAuthenticated(), IsTenantMember(), IsResourceOwnerOrTenantAdmin()]
        return [permissions.IsAuthenticated(), IsTenantMember()]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        qp = self.request.query_params

        if qp.get("project"):
            queryset = queryset.filter(project_id=qp["project"])
        if qp.get("status"):
            queryset = queryset.filter(status__in=qp["status"].split(","))
        if qp.get("priority"):
            queryset = queryset.filter(priority__in=qp["priority"].split(","))
        if qp.get("assignee"):
            queryset = queryset.filter(assignee_id=qp["assignee"])
        if qp.get("assignee_me") == "true":
            queryset = queryset.filter(assignee=self.request.user)
        if qp.get("created_by"):
            queryset = queryset.filter(created_by_id=qp["created_by"])
        if qp.get("due_date_before"):
            queryset = queryset.filter(due_date__lte=qp["due_date_before"])
        if qp.get("due_date_after"):
            queryset = queryset.filter(due_date__gte=qp["due_date_after"])
        if qp.get("overdue") == "true":
            queryset = queryset.filter(due_date__lt=__import__("django.utils.timezone").utils.timezone.localdate()).exclude(status=Task.Status.DONE)
        if qp.get("search"):
            queryset = queryset.filter(Q(title__icontains=qp["search"]) | Q(description__icontains=qp["search"]))

        ordering = qp.get("ordering")
        allowed = {"created_at", "due_date", "priority", "status", "position"}
        if ordering:
            field = ordering.lstrip("-")
            if field in allowed:
                queryset = queryset.order_by(ordering)
        return queryset

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.tenant, created_by=self.request.user)

    @action(detail=True, methods=["patch"])
    def move(self, request, pk=None):
        task = self.get_object()
        status_to = request.data.get("status", task.status)
        position = request.data.get("position")

        with transaction.atomic():
            if status_to != task.status:
                task.status = status_to
            if position is None:
                max_pos = Task.objects.filter(tenant=request.tenant, project=task.project, status=task.status).exclude(id=task.id).order_by("-position").values_list("position", flat=True).first()
                task.position = 0 if max_pos is None else max_pos + 1
            else:
                task.position = max(int(position), 0)
            task.save(update_fields=["status", "position", "updated_at"])

        return Response(TaskSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            rows = task.comments.select_related("author").order_by("created_at")
            return Response(CommentSerializer(rows, many=True).data)

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = Comment.objects.create(
            tenant=request.tenant,
            task=task,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(CommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch", "delete"], url_path="comments/(?P<comment_id>[^/.]+)")
    def comment_detail(self, request, pk=None, comment_id=None):
        task = self.get_object()
        comment = task.comments.filter(id=comment_id, tenant=request.tenant).select_related("author").first()
        if not comment:
            return Response({"error": "not_found"}, status=status.HTTP_404_NOT_FOUND)

        membership = request.membership
        can_manage = comment.author_id == request.user.id or membership.role in {"admin", "owner"}
        if not can_manage:
            return Response({"error": "insufficient_role"}, status=status.HTTP_403_FORBIDDEN)

        if request.method == "PATCH":
            body = request.data.get("body", "").strip()
            if not body:
                return Response({"error": "validation_error", "detail": {"body": ["This field is required."]}}, status=status.HTTP_400_BAD_REQUEST)
            comment.body = body
            comment.edited = True
            comment.save(update_fields=["body", "edited", "updated_at"])
            return Response(CommentSerializer(comment).data)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        task = self.get_object()
        rows = task.activity.select_related("actor").all()
        page = self.paginate_queryset(rows)
        if page is not None:
            return self.get_paginated_response(ActivitySerializer(page, many=True).data)
        return Response(ActivitySerializer(rows, many=True).data)


class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(recipient=request.user).select_related("actor", "task", "task__tenant")
        is_read = request.query_params.get("is_read")
        if is_read in {"true", "false"}:
            queryset = queryset.filter(is_read=(is_read == "true"))

        page_size = min(int(request.query_params.get("limit", 20)), 50)
        rows = queryset[:page_size]
        return Response(
            {
                "unread_count": Notification.objects.filter(recipient=request.user, is_read=False).count(),
                "count": queryset.count(),
                "results": NotificationSerializer(rows, many=True).data,
            }
        )


class NotificationMarkAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, mode):
        queryset = Notification.objects.filter(recipient=request.user)
        if request.data.get("all") is True:
            target = queryset
        else:
            ids = request.data.get("ids", [])
            target = queryset.filter(id__in=ids)

        updated = target.update(is_read=(mode == "read"))
        return Response({"updated": updated})
