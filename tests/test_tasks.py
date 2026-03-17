from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Comment, Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class TaskModuleTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@x.com", password="StrongPass1")
        self.member = User.objects.create_user(email="member@x.com", password="StrongPass1")
        self.viewer = User.objects.create_user(email="viewer@x.com", password="StrongPass1")
        self.outsider = User.objects.create_user(email="outside@outside.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.other_tenant = Tenant.objects.create(name="Other", slug="other")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant, user=self.member, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.tenant, user=self.viewer, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.other_tenant, user=self.outsider, role=Membership.Role.MEMBER)
        self.project = Project.objects.create(tenant=self.tenant, name="P1", description="", color="#6366F1", created_by=self.owner)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.owner, role=ProjectMember.Role.ADMIN)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.member, role=ProjectMember.Role.MEMBER)
        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_create_task(self):
        response = self.client.post(
            reverse("task-list"),
            {
                "project": str(self.project.id),
                "title": "Fix bug",
                "description": "details",
                "status": "todo",
                "priority": "high",
                "assignee": str(self.member.id),
            },
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_comment_flow(self):
        task = Task.objects.create(tenant=self.tenant, project=self.project, title="T", description="", created_by=self.owner, assignee=self.member)
        create_res = self.client.post(
            reverse("task-comments", kwargs={"pk": task.id}),
            {"body": "hello"},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Comment.objects.count(), 1)

    def test_comment_mentions_are_workspace_scoped_and_create_notifications(self):
        task = Task.objects.create(tenant=self.tenant, project=self.project, title="T", description="", created_by=self.owner, assignee=self.member)
        create_res = self.client.post(
            reverse("task-comments", kwargs={"pk": task.id}),
            {"body": "hello @member and @outside"},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)

        comment = Comment.objects.get(id=create_res.data["id"])
        self.assertEqual(comment.mentions, [str(self.member.id)])

        self.assertTrue(
            Notification.objects.filter(
                workspace=self.tenant,
                user=self.member,
                actor=self.owner,
                type="mention",
                payload__task_id=str(task.id),
            ).exists()
        )
        self.assertFalse(Notification.objects.filter(workspace=self.tenant, user=self.outsider, type="mention").exists())

    def test_mentioned_user_can_view_task_and_mentioned_comments_within_tenant(self):
        task = Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Mention visibility task",
            description="",
            created_by=self.owner,
            assignee=self.member,
        )
        Comment.objects.create(
            tenant=self.tenant,
            task=task,
            author=self.owner,
            body="private note",
            mentions=[],
        )
        self.client.post(
            reverse("task-comments", kwargs={"pk": task.id}),
            {"body": "please review this @viewer"},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )

        viewer_token = RefreshToken.for_user(self.viewer)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {viewer_token.access_token}")

        task_res = self.client.get(reverse("task-detail", kwargs={"pk": task.id}), HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(task_res.status_code, status.HTTP_200_OK)

        comments_res = self.client.get(reverse("task-comments", kwargs={"pk": task.id}), HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(comments_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(comments_res.data), 1)
        self.assertIn("@viewer", comments_res.data[0]["body"])
