from rest_framework import serializers

from apps.notifications.models import Notification


class MemberNotificationSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ("id", "type", "message", "payload", "is_read", "read_at", "created_at", "actor")

    def get_actor(self, obj):
        if not obj.actor:
            return None
        return {
            "id": obj.actor_id,
            "name": obj.actor.display_name,
            "avatar_url": obj.actor.avatar_url,
        }

