from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class DashboardRangeAPITests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@dashboard.com", password="StrongPass1", first_name="Owner")
        self.member = User.objects.create_user(email="member@dashboard.com", password="StrongPass1", first_name="Member")
        self.other_user = User.objects.create_user(email="other@dashboard.com", password="StrongPass1", first_name="Other")

        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a-range")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b-range")

        Membership.objects.create(tenant=self.tenant_a, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant_a, user=self.member, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.tenant_b, user=self.other_user, role=Membership.Role.OWNER)

        self.project_a = Project.objects.create(tenant=self.tenant_a, name="A Project", created_by=self.owner)
        self.project_b = Project.objects.create(tenant=self.tenant_b, name="B Project", created_by=self.other_user)

        self._create_done_task(self.tenant_a, self.project_a, self.owner, self.owner, days_ago=1)
        self._create_done_task(self.tenant_a, self.project_a, self.owner, self.member, days_ago=3)
        self._create_done_task(self.tenant_a, self.project_a, self.owner, self.member, days_ago=20)
        self._create_done_task(self.tenant_b, self.project_b, self.other_user, self.other_user, days_ago=2)

        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    @staticmethod
    def _create_done_task(tenant, project, creator, assignee, days_ago):
        task = Task.objects.create(
            tenant=tenant,
            project=project,
            created_by=creator,
            assignee=assignee,
            title=f"Done {days_ago}",
            status=Task.Status.DONE,
            priority=Task.Priority.MEDIUM,
        )
        target = timezone.now() - timedelta(days=days_ago)
        Task.objects.filter(id=task.id).update(updated_at=target, created_at=target)
        task.refresh_from_db()
        return task

    def test_tasks_trend_defaults_to_7d_and_is_tenant_scoped(self):
        response = self.client.get(reverse("dashboard-tasks-trend"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "7d")
        self.assertEqual(len(response.data["results"]), 7)
        self.assertEqual(sum(item["completed"] for item in response.data["results"]), 2)

    def test_tasks_trend_30d_includes_older_items(self):
        response = self.client.get(
            reverse("dashboard-tasks-trend"),
            {"range": "30d"},
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "30d")
        self.assertEqual(len(response.data["results"]), 30)
        self.assertEqual(sum(item["completed"] for item in response.data["results"]), 3)

    def test_tasks_trend_invalid_range_falls_back_to_7d(self):
        response = self.client.get(
            reverse("dashboard-tasks-trend"),
            {"range": "oops"},
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "7d")
        self.assertEqual(sum(item["completed"] for item in response.data["results"]), 2)

    def test_team_performance_defaults_to_7d(self):
        response = self.client.get(reverse("dashboard-team-performance"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "7d")

        by_name = {row["name"]: row["completed"] for row in response.data["results"]}
        self.assertEqual(by_name.get(self.owner.display_name), 1)
        self.assertEqual(by_name.get(self.member.display_name), 1)
        self.assertNotIn(self.other_user.display_name, by_name)

    def test_team_performance_30d_expands_counts(self):
        response = self.client.get(
            reverse("dashboard-team-performance"),
            {"range": "30d"},
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"], "30d")

        by_name = {row["name"]: row["completed"] for row in response.data["results"]}
        self.assertEqual(by_name.get(self.owner.display_name), 1)
        self.assertEqual(by_name.get(self.member.display_name), 2)
