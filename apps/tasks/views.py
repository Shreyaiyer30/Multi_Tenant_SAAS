from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.mixins import TenantScopedQuerysetMixin
from apps.common.permissions import IsResourceOwnerOrTenantAdmin, IsTenantAdminOrOwner, IsTenantMember
from apps.notifications.services import notify_users
from apps.projects.models import ProjectMember
from apps.tasks.mentions import resolve_mentioned_users
from apps.tasks.models import Comment, Notification, Task, TaskActivity
from apps.tasks.serializers import CommentSerializer, NotificationSerializer, TaskSerializer
from apps.tasks.services import TaskService


class TaskViewSet(TenantScopedQuerysetMixin, viewsets.ModelViewSet):
    queryset = Task.objects.select_related("project", "created_by", "assignee", "tenant").all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    @staticmethod
    def _is_admin_or_owner(request):
        membership = getattr(request, "membership", None)
        return bool(membership and membership.role in {"admin", "owner"})

    @staticmethod
    def _mentioned_task_ids_for_user(tenant, user):
        user_id = str(user.id)
        mentioned_task_ids = set()
        comment_rows = Comment.objects.filter(tenant=tenant).values_list("task_id", "mentions")
        for task_id, mentions in comment_rows:
            mention_values = mentions if isinstance(mentions, list) else []
            normalized = {str(item) for item in mention_values}
            if user_id in normalized:
                mentioned_task_ids.add(task_id)
        return list(mentioned_task_ids)

    def get_permissions(self):
        if self.action in {"create"}:
            return [permissions.IsAuthenticated(), IsTenantMember(), IsTenantAdminOrOwner()]
        if self.action in {"update", "partial_update", "destroy", "move"}:
            return [permissions.IsAuthenticated(), IsTenantMember(), IsResourceOwnerOrTenantAdmin()]
        return [permissions.IsAuthenticated(), IsTenantMember()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self._is_admin_or_owner(self.request):
            return queryset
        mentioned_task_ids = self._mentioned_task_ids_for_user(self.request.tenant, self.request.user)
        return (
            queryset.filter(
                Q(assignee=self.request.user)
                | Q(project__members__user=self.request.user, project__members__tenant=self.request.tenant)
                | Q(id__in=mentioned_task_ids)
            )
            .distinct()
        )

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        qp = self.request.query_params

        if qp.get("project"):
            queryset = queryset.filter(project_id__in=qp["project"].split(","))
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
            queryset = queryset.filter(due_date__lt=timezone.localdate()).exclude(status=Task.Status.DONE)
        completed = qp.get("completed")
        if completed in {"true", "false"}:
            queryset = queryset.filter(status=Task.Status.DONE) if completed == "true" else queryset.exclude(status=Task.Status.DONE)
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
        TaskService.create_task(request=self.request, serializer=serializer, actor=self.request.user)

    def perform_destroy(self, instance):
        TaskService.delete_task(request=self.request, task=instance, actor=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        result = TaskService.update_task(
            request=request,
            task=instance,
            validated_data=serializer.validated_data,
            actor=request.user,
        )
        return Response(self.get_serializer(result.task).data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    @action(detail=True, methods=["patch"])
    def move(self, request, pk=None):
        task = self.get_object()
        status_to = request.data.get("status", task.status)
        position = request.data.get("position")

        if status_to != task.status:
            TaskService.update_task(
                request=request,
                task=task,
                validated_data={"status": status_to},
                actor=request.user,
                auto_assign=False,
            )

        with transaction.atomic():
            if position is None:
                max_pos = Task.objects.filter(tenant=request.tenant, project=task.project, status=task.status).exclude(id=task.id).order_by("-position").values_list("position", flat=True).first()
                task.position = 0 if max_pos is None else max_pos + 1
            else:
                task.position = max(int(position), 0)
            task.save(update_fields=["position", "updated_at"])

        return Response(TaskSerializer(task, context={"request": request}).data)

    @action(detail=True, methods=["get", "post"], url_path="comments")
    def comments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            rows = task.comments.select_related("author").order_by("created_at")
            if not self._is_admin_or_owner(request):
                is_project_member = ProjectMember.objects.filter(
                    tenant=request.tenant,
                    project=task.project,
                    user=request.user,
                ).exists()
                is_assignee = task.assignee_id == request.user.id
                is_creator = task.created_by_id == request.user.id
                if not (is_project_member or is_assignee or is_creator):
                    rows = [
                        row
                        for row in rows
                        if row.author_id == request.user.id
                        or str(request.user.id) in {str(item) for item in (row.mentions or [])}
                    ]
            return Response(CommentSerializer(rows, many=True).data)

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        mentioned_users = resolve_mentioned_users(
            request.tenant,
            serializer.validated_data["body"],
        )
        mention_ids = [str(user.id) for user in mentioned_users]
        comment = Comment.objects.create(
            tenant=request.tenant,
            task=task,
            author=request.user,
            body=serializer.validated_data["body"],
            mentions=mention_ids,
        )
        notify_users(
            request.tenant,
            [user for user in mentioned_users if user.id != request.user.id],
            n_type="mention",
            message=f"{request.user.display_name} mentioned you in task '{task.title}'.",
            payload={"task_id": str(task.id), "project_id": str(task.project_id), "comment_id": str(comment.id)},
            actor=request.user,
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
            previous_mentions = set(comment.mentions or [])
            mentioned_users = resolve_mentioned_users(
                request.tenant,
                body,
            )
            mention_ids = [str(user.id) for user in mentioned_users]
            comment.body = body
            comment.mentions = mention_ids
            comment.edited = True
            comment.save(update_fields=["body", "mentions", "edited", "updated_at"])
            new_mentioned_users = [
                user
                for user in mentioned_users
                if str(user.id) not in previous_mentions and user.id != request.user.id
            ]
            notify_users(
                request.tenant,
                new_mentioned_users,
                n_type="mention",
                message=f"{request.user.display_name} mentioned you in task '{task.title}'.",
                payload={"task_id": str(task.id), "project_id": str(task.project_id), "comment_id": str(comment.id)},
                actor=request.user,
            )
            return Response(CommentSerializer(comment).data)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="activity")
    def activity(self, request, pk=None):
        task = self.get_object()
        rows = TaskActivity.objects.filter(task=task, tenant=request.tenant).select_related("actor")
        page = self.paginate_queryset(rows)
        if page is not None:
            payload = [
                {
                    "id": row.id,
                    "event_type": row.event_type,
                    "actor": {"id": row.actor_id, "display_name": row.actor.display_name, "avatar_url": row.actor.avatar_url},
                    "old_values": row.old_values,
                    "new_values": row.new_values,
                    "created_at": row.created_at,
                }
                for row in page
            ]
            return self.get_paginated_response(payload)
        return Response(
            [
                {
                    "id": row.id,
                    "event_type": row.event_type,
                    "actor": {"id": row.actor_id, "display_name": row.actor.display_name, "avatar_url": row.actor.avatar_url},
                    "old_values": row.old_values,
                    "new_values": row.new_values,
                    "created_at": row.created_at,
                }
                for row in rows
            ]
        )


class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        base_queryset = Notification.objects.filter(recipient=request.user, tenant=request.tenant).select_related("actor", "task", "task__tenant")
        queryset = base_queryset
        is_read = request.query_params.get("is_read")
        if is_read in {"true", "false"}:
            queryset = queryset.filter(is_read=(is_read == "true"))

        try:
            page_size = int(request.query_params.get("limit", 20))
        except (TypeError, ValueError):
            page_size = 20
        page_size = max(1, min(page_size, 50))
        rows = queryset[:page_size]
        return Response(
            {
                "unread_count": base_queryset.filter(is_read=False).count(),
                "count": queryset.count(),
                "results": NotificationSerializer(rows, many=True).data,
            }
        )


class NotificationMarkAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def post(self, request, mode):
        queryset = Notification.objects.filter(recipient=request.user, tenant=request.tenant)
        if request.data.get("all") is True:
            target = queryset
        else:
            ids = request.data.get("ids", [])
            if not isinstance(ids, list):
                return Response(
                    {"error": "validation_error", "detail": {"ids": ["This field must be a list."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            target = queryset.filter(id__in=ids)

        if mode == "read":
            updated = target.update(is_read=True, read_at=timezone.now())
        else:
            updated = target.update(is_read=False, read_at=None)
        return Response({"updated": updated})


class NotificationDetailAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def patch(self, request, notification_id):
        raw_read = request.data.get("read", True)
        if isinstance(raw_read, bool):
            read = raw_read
        elif isinstance(raw_read, str):
            read = raw_read.strip().lower() in {"true", "1", "yes"}
        else:
            read = bool(raw_read)
        row = Notification.objects.filter(id=notification_id, recipient=request.user, tenant=request.tenant).first()
        if not row:
            return Response({"error": "not_found"}, status=status.HTTP_404_NOT_FOUND)
        if read:
            row.is_read = True
            row.read_at = timezone.now()
        else:
            row.is_read = False
            row.read_at = None
        row.save(update_fields=["is_read", "read_at"])
        return Response(NotificationSerializer(row).data)
