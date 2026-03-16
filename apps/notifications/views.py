from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.permissions import IsTenantMember
from apps.notifications.models import Notification
from apps.notifications.serializers import MemberNotificationSerializer
from apps.notifications.services import mark_all_read, mark_notifications_read


class NotificationListAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def get(self, request):
        workspace = request.tenant
        unread_only = str(request.query_params.get("unread_only", "false")).lower() == "true"
        queryset = Notification.objects.filter(workspace=workspace, user=request.user).select_related("actor")
        if unread_only:
            queryset = queryset.filter(is_read=False)
        return Response(
            {
                "count": queryset.count(),
                "unread_count": Notification.objects.filter(
                    workspace=workspace,
                    user=request.user,
                    is_read=False,
                ).count(),
                "results": MemberNotificationSerializer(queryset[:50], many=True).data,
            }
        )


class NotificationMarkReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def post(self, request):
        workspace = request.tenant
        ids = request.data.get("ids", [])
        updated = mark_notifications_read(workspace, request.user, ids=ids)
        return Response({"updated": updated})


class NotificationMarkAllReadAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsTenantMember]

    def post(self, request):
        workspace = request.tenant
        updated = mark_all_read(workspace, request.user)
        return Response({"updated": updated})
