from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant
from apps.projects.models import Project
from apps.tasks.models import Task

User = get_user_model()

class DashboardDataTests(APITestCase):
    def setUp(self):
        self.user_admin = User.objects.create_user(email="admin@example.com", password="Pass1")
        self.tenant = Tenant.objects.create(name="Tenant", slug="tenant")
        Membership.objects.create(tenant=self.tenant, user=self.user_admin, role=Membership.Role.ADMIN)
        
        self.project1 = Project.objects.create(tenant=self.tenant, name="P1", created_by=self.user_admin)
        self.project2 = Project.objects.create(tenant=self.tenant, name="P2", created_by=self.user_admin)
        
        Task.objects.create(tenant=self.tenant, project=self.project1, created_by=self.user_admin, title="T1", status="done")
        Task.objects.create(tenant=self.tenant, project=self.project1, created_by=self.user_admin, title="T2", status="todo")
        
        token = RefreshToken.for_user(self.user_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_dashboard_summary_counts(self):
        url = reverse("workspace-dashboard-summary")
        response = self.client.get(url, HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data["total_projects"], 2)
        self.assertEqual(data["total_tasks"], 2)
        self.assertEqual(data["completed_tasks"], 1)
        self.assertEqual(data["completion_rate"], 50)
