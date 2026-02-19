from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project
from apps.tasks.models import Comment, Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class TaskModuleTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@x.com", password="StrongPass1")
        self.member = User.objects.create_user(email="member@x.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant, user=self.member, role=Membership.Role.MEMBER)
        self.project = Project.objects.create(tenant=self.tenant, name="P1", description="", color="#6366F1", created_by=self.owner)
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
