from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.models import AuditLog
from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class DashboardNotificationsActivityTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@test.com", password="StrongPass1", first_name="Owner")
        self.member = User.objects.create_user(email="member@test.com", password="StrongPass1", first_name="Member")
        self.other_user = User.objects.create_user(email="other@test.com", password="StrongPass1")

        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b")

        Membership.objects.create(tenant=self.tenant_a, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant_a, user=self.member, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.tenant_b, user=self.other_user, role=Membership.Role.OWNER)

        self.project_a = Project.objects.create(tenant=self.tenant_a, name="A Project", created_by=self.owner)
        self.project_b = Project.objects.create(tenant=self.tenant_b, name="B Project", created_by=self.other_user)

        ProjectMember.objects.create(tenant=self.tenant_a, project=self.project_a, user=self.owner, role=ProjectMember.Role.ADMIN)
        ProjectMember.objects.create(tenant=self.tenant_a, project=self.project_a, user=self.member, role=ProjectMember.Role.MEMBER)
        ProjectMember.objects.create(tenant=self.tenant_b, project=self.project_b, user=self.other_user, role=ProjectMember.Role.ADMIN)

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_dashboard_overview_is_tenant_scoped(self):
        Task.objects.create(
            tenant=self.tenant_a,
            project=self.project_a,
            created_by=self.owner,
            title="A1",
            status=Task.Status.TODO,
            priority=Task.Priority.HIGH,
        )
        Task.objects.create(
            tenant=self.tenant_a,
            project=self.project_a,
            created_by=self.owner,
            title="A2",
            status=Task.Status.DONE,
            priority=Task.Priority.LOW,
        )
        Task.objects.create(
            tenant=self.tenant_b,
            project=self.project_b,
            created_by=self.other_user,
            title="B1",
            status=Task.Status.IN_PROGRESS,
            priority=Task.Priority.MEDIUM,
        )

        self._auth(self.owner)
        response = self.client.get(reverse("dashboard-overview"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["projects"]["total"], 1)
        self.assertEqual(response.data["projects"]["by_status"]["todo"], 1)
        self.assertEqual(response.data["projects"]["by_status"]["done"], 1)
        self.assertEqual(response.data["projects"]["by_status"]["in_progress"], 0)
        self.assertEqual(response.data["projects"]["by_priority"]["high"], 1)
        self.assertEqual(response.data["projects"]["by_priority"]["low"], 1)
        self.assertEqual(response.data["projects"]["by_priority"]["medium"], 0)

    def test_task_events_create_audit_and_member_notifications(self):
        self._auth(self.owner)
        create_res = self.client.post(
            reverse("task-list"),
            {
                "project": str(self.project_a.id),
                "title": "Tenant safe task",
                "status": Task.Status.TODO,
                "priority": Task.Priority.MEDIUM,
                "assignee": str(self.member.id),
            },
            format="json",
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        task_id = create_res.data["id"]

        self.client.patch(
            reverse("task-detail", kwargs={"pk": task_id}),
            {"status": Task.Status.IN_PROGRESS},
            format="json",
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.client.delete(reverse("task-detail", kwargs={"pk": task_id}), HTTP_X_TENANT=self.tenant_a.slug)

        self.assertTrue(AuditLog.objects.filter(workspace=self.tenant_a, action=AuditLog.Action.TASK_CREATED).exists())
        self.assertTrue(AuditLog.objects.filter(workspace=self.tenant_a, action=AuditLog.Action.TASK_STATUS_CHANGED).exists())
        self.assertTrue(AuditLog.objects.filter(workspace=self.tenant_a, action=AuditLog.Action.TASK_DELETED).exists())

        member_notifications = Notification.objects.filter(workspace=self.tenant_a, user=self.member)
        self.assertTrue(member_notifications.exists())
        self.assertFalse(Notification.objects.filter(workspace=self.tenant_b, user=self.member).exists())

    def test_recent_activity_and_mark_read_are_scoped_to_workspace_and_user(self):
        AuditLog.objects.create(
            workspace=self.tenant_a,
            actor=self.owner,
            action=AuditLog.Action.TASK_UPDATED,
            entity_type="task",
            entity_id="123",
            metadata={"task_id": "123", "task_title": "Workspace A Task"},
        )
        AuditLog.objects.create(
            workspace=self.tenant_b,
            actor=self.other_user,
            action=AuditLog.Action.TASK_UPDATED,
            entity_type="task",
            entity_id="999",
            metadata={"task_id": "999", "task_title": "Workspace B Task"},
        )
        mine = Notification.objects.create(
            workspace=self.tenant_a,
            user=self.member,
            actor=self.owner,
            type="task_updated",
            message="Task updated",
            payload={"task_id": "123"},
        )
        Notification.objects.create(
            workspace=self.tenant_b,
            user=self.other_user,
            actor=self.owner,
            type="task_updated",
            message="Task updated elsewhere",
            payload={"task_id": "999"},
        )

        self._auth(self.member)
        activity_res = self.client.get(reverse("dashboard-recent-activity"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(activity_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(activity_res.data), 1)
        self.assertEqual(activity_res.data[0]["task"]["title"], "Workspace A Task")

        list_res = self.client.get(reverse("member-notifications-list"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(list_res.data["count"], 1)

        mark_res = self.client.post(
            reverse("member-notifications-mark-read"),
            {"ids": [str(mine.id)]},
            format="json",
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(mark_res.status_code, status.HTTP_200_OK)
        mine.refresh_from_db()
        self.assertTrue(mine.is_read)

