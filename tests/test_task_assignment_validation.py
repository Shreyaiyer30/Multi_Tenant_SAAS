from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

User = get_user_model()

class TaskAssignmentTests(APITestCase):
    def setUp(self):
        self.user_admin = User.objects.create_user(email="admin@example.com", password="Pass1")
        self.user_member = User.objects.create_user(email="member@example.com", password="Pass1")
        self.user_not_project = User.objects.create_user(email="notproject@example.com", password="Pass1")
        
        self.tenant = Tenant.objects.create(name="Tenant", slug="tenant")
        Membership.objects.create(tenant=self.tenant, user=self.user_admin, role=Membership.Role.ADMIN)
        Membership.objects.create(tenant=self.tenant, user=self.user_member, role=Membership.Role.MEMBER)
        Membership.objects.create(tenant=self.tenant, user=self.user_not_project, role=Membership.Role.MEMBER)
        
        self.project = Project.objects.create(tenant=self.tenant, name="Project", created_by=self.user_admin)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.user_admin, role=ProjectMember.Role.ADMIN)
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.user_member, role=ProjectMember.Role.MEMBER)
        # self.user_not_project is IN tenant but NOT in project

        token = RefreshToken.for_user(self.user_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_assign_to_project_member_succeeds(self):
        url = reverse("task-list")
        data = {
            "project": str(self.project.id),
            "title": "New Task",
            "assignee": str(self.user_member.id),
            "status": "todo"
        }
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_assign_to_non_project_member_fails(self):
        url = reverse("task-list")
        data = {
            "project": str(self.project.id),
            "title": "New Task",
            "assignee": str(self.user_not_project.id),
            "status": "todo"
        }
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check for specific error code if provided in backend
        self.assertIn("assignee", response.data.get("detail", {}))
        
    def test_update_assignee_to_non_project_member_fails(self):
        task = Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, title="Task")
        url = reverse("task-detail", kwargs={"pk": task.id})
        data = {"assignee": str(self.user_not_project.id)}
        response = self.client.patch(url, data, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
