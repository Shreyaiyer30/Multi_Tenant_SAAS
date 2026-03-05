from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project
from apps.tasks.models import Task
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class SearchAndFilterTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@x.com", password="StrongPass1")
        self.member = User.objects.create_user(email="member@x.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant, user=self.member, role=Membership.Role.MEMBER)

        self.project_a = Project.objects.create(
            tenant=self.tenant,
            name="Website Revamp",
            description="Redesign home page",
            status=Project.Status.ONGOING,
            created_by=self.owner,
        )
        self.project_b = Project.objects.create(
            tenant=self.tenant,
            name="Archive Cleanup",
            description="Old docs cleanup",
            status=Project.Status.COMPLETED,
            created_by=self.owner,
        )
        Task.objects.create(
            tenant=self.tenant,
            project=self.project_a,
            title="Build landing hero",
            description="Design + implementation",
            status=Task.Status.IN_PROGRESS,
            created_by=self.owner,
            assignee=self.member,
        )
        Task.objects.create(
            tenant=self.tenant,
            project=self.project_b,
            title="Finalize docs",
            description="Close all pending docs tasks",
            status=Task.Status.DONE,
            created_by=self.owner,
            assignee=self.owner,
        )

        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_project_filters_and_search(self):
        response = self.client.get(
            f"{reverse('project-list')}?status=completed&search=archive",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Archive Cleanup")

    def test_task_filters_with_completed_and_project_list(self):
        response = self.client.get(
            f"{reverse('task-list')}?project={self.project_a.id},{self.project_b.id}&completed=true",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["title"], "Finalize docs")
