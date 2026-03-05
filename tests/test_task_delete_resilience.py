from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project, ProjectMember
from apps.tasks.models import ActivityEvent, Comment, Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class TaskDeleteResilienceTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@task-delete.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Task Delete Workspace", slug="task-delete-workspace")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        self.project = Project.objects.create(
            tenant=self.tenant,
            name="Task Delete Project",
            description="",
            color="#111111",
            created_by=self.owner,
        )
        ProjectMember.objects.create(
            tenant=self.tenant,
            project=self.project,
            user=self.owner,
            role=ProjectMember.Role.ADMIN,
        )
        self.task = Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Delete me",
            description="",
            created_by=self.owner,
        )
        Comment.objects.create(
            tenant=self.tenant,
            task=self.task,
            author=self.owner,
            body="comment",
        )

        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_task_delete_survives_comment_activity_fk_race(self):
        def fail_comment_deleted_event(*args, **kwargs):
            if kwargs.get("event_type") == ActivityEvent.EventType.COMMENT_DELETED:
                raise IntegrityError("fk violation")
            return None

        with patch("apps.tasks.signals.ActivityEvent.objects.create", side_effect=fail_comment_deleted_event):
            response = self.client.delete(
                reverse("task-detail", kwargs={"pk": self.task.id}),
                HTTP_X_TENANT=self.tenant.slug,
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=self.task.id).exists())

    def test_project_delete_skips_comment_deleted_activity_on_cascade(self):
        def fail_comment_deleted_event(*args, **kwargs):
            if kwargs.get("event_type") == ActivityEvent.EventType.COMMENT_DELETED:
                raise ValueError("comment_deleted should not be emitted on cascade delete")
            return None

        with patch("apps.tasks.signals.ActivityEvent.objects.create", side_effect=fail_comment_deleted_event):
            response = self.client.delete(
                reverse("project-detail", kwargs={"pk": self.project.id}),
                HTTP_X_TENANT=self.tenant.slug,
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())
