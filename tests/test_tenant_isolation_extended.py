from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

User = get_user_model()

class TenantIsolationExtendedTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email="a@example.com", password="Pass1")
        self.user_b = User.objects.create_user(email="b@example.com", password="Pass1")
        
        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b")
        
        Membership.objects.create(tenant=self.tenant_a, user=self.user_a, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant_b, user=self.user_b, role=Membership.Role.OWNER)
        
        self.project_a = Project.objects.create(tenant=self.tenant_a, name="Project A", created_by=self.user_a)
        self.project_b = Project.objects.create(tenant=self.tenant_b, name="Project B", created_by=self.user_b)

        token = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_cannot_access_other_tenant_project(self):
        url = reverse("project-detail", kwargs={"pk": self.project_b.id})
        response = self.client.get(url, HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_assign_task_to_user_from_other_tenant(self):
        url = reverse("task-list")
        data = {
            "project": str(self.project_a.id),
            "title": "Hack Task",
            "assignee": str(self.user_b.id)
        }
        # user_b is in tenant_b, not tenant_a
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
    def test_cannot_add_member_from_other_tenant_to_project(self):
        url = reverse("project-members", kwargs={"pk": self.project_a.id})
        data = {"user_id": str(self.user_b.id), "role": "member"}
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
