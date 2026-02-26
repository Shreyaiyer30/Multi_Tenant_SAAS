from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Notification, Task, TaskActivity
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class WorkflowRegressionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@wf.com", password="StrongPass1")
        self.member = User.objects.create_user(email="member@wf.com", password="StrongPass1")
        self.other = User.objects.create_user(email="other@wf.com", password="StrongPass1")

        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        self.tenant_b = Tenant.objects.create(name="Beta", slug="beta")

        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant, user=self.member, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.tenant_b, user=self.other, role=Membership.Role.OWNER)

        self.project = Project.objects.create(tenant=self.tenant, name="P1", description="", color="#111111", created_by=self.owner)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.owner, role=ProjectMember.Role.ADMIN)

        self.project_b = Project.objects.create(tenant=self.tenant_b, name="P2", description="", color="#222222", created_by=self.other)
        ProjectMember.objects.create(tenant=self.tenant_b, project=self.project_b, user=self.other, role=ProjectMember.Role.ADMIN)

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_cross_tenant_isolation(self):
        Task.objects.create(tenant=self.tenant, project=self.project, title="A", description="", created_by=self.owner, assignee=self.owner)
        Task.objects.create(tenant=self.tenant_b, project=self.project_b, title="B", description="", created_by=self.other, assignee=self.other)

        self._auth(self.owner)
        response = self.client.get(reverse("task-list"), HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["results"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "A")

    def test_project_member_enforced_for_assignment(self):
        self._auth(self.owner)
        response = self.client.post(
            reverse("task-list"),
            {
                "project": str(self.project.id),
                "title": "Needs assignment",
                "description": "",
                "assignee": str(self.member.id),
                "status": "todo",
                "priority": "medium",
            },
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assignee", response.data["detail"])

    def test_task_activity_and_notifications_created(self):
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.member, role=ProjectMember.Role.MEMBER)
        task = Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="T1",
            description="",
            created_by=self.owner,
            assignee=self.owner,
            status=Task.Status.TODO,
        )

        self._auth(self.owner)
        response = self.client.patch(
            reverse("task-detail", kwargs={"pk": task.id}),
            {"assignee": str(self.member.id), "status": "done"},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(TaskActivity.objects.filter(task=task).count(), 1)
        self.assertTrue(Notification.objects.filter(tenant=self.tenant, recipient=self.member, type="task_assigned").exists())
        self.assertTrue(Notification.objects.filter(tenant=self.tenant, type="task_completed").exists())

    def test_auto_assignment_deterministic(self):
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.member, role=ProjectMember.Role.MEMBER)
        done_task = Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Done First",
            description="",
            created_by=self.owner,
            assignee=self.member,
            status=Task.Status.IN_PROGRESS,
            priority=Task.Priority.MEDIUM,
        )
        t1 = Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Urgent Next",
            description="",
            created_by=self.owner,
            assignee=None,
            status=Task.Status.TODO,
            priority=Task.Priority.URGENT,
        )
        Task.objects.create(
            tenant=self.tenant,
            project=self.project,
            title="Low Later",
            description="",
            created_by=self.owner,
            assignee=None,
            status=Task.Status.TODO,
            priority=Task.Priority.LOW,
        )

        self._auth(self.owner)
        response = self.client.patch(
            reverse("task-detail", kwargs={"pk": done_task.id}),
            {"status": "done"},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        t1.refresh_from_db()
        self.assertEqual(t1.assignee_id, self.member.id)


