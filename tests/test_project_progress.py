from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

User = get_user_model()

class ProjectProgressTests(APITestCase):
    def setUp(self):
        self.user_admin = User.objects.create_user(email="admin@example.com", password="Pass1")
        self.tenant = Tenant.objects.create(name="Tenant", slug="tenant")
        Membership.objects.create(tenant=self.tenant, user=self.user_admin, role=Membership.Role.ADMIN)
        
        self.project = Project.objects.create(tenant=self.tenant, name="Project", created_by=self.user_admin)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.user_admin, role=ProjectMember.Role.ADMIN)

        token = RefreshToken.for_user(self.user_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_task_done_updates_project_progress(self):
        task1 = Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, title="T1", status="todo")
        task2 = Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, title="T2", status="todo")
        
        self.project.refresh_from_db()
        self.assertEqual(self.project.completion_percent, 0)
        
        # Move task1 to done
        url = reverse("task-detail", kwargs={"pk": task1.id})
        self.client.patch(url, {"status": "done"}, format="json", HTTP_X_TENANT=self.tenant.slug)
        
        self.project.refresh_from_db()
        self.assertEqual(self.project.completion_percent, 50)
        
        task1.refresh_from_db()
        self.assertEqual(task1.progress_percent, 100)
        
    def test_project_progress_stats_endpoint(self):
        Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, title="T1", status="done")
        Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, title="T2", status="todo")
        
        from apps.projects.services import ProjectService
        ProjectService.recompute_completion(self.project)
        
        url = reverse("project-stats", kwargs={"pk": self.project.id})
        response = self.client.get(url, HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["progress_percent"], 50)
