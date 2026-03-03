from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task

User = get_user_model()

class ProjectMembershipTests(APITestCase):
    def setUp(self):
        self.user_admin = User.objects.create_user(email="admin@example.com", password="Pass1")
        self.user_member = User.objects.create_user(email="member@example.com", password="Pass1")
        self.user_other = User.objects.create_user(email="other@example.com", password="Pass1")
        
        self.tenant = Tenant.objects.create(name="Tenant", slug="tenant")
        Membership.objects.create(tenant=self.tenant, user=self.user_admin, role=Membership.Role.ADMIN)
        Membership.objects.create(tenant=self.tenant, user=self.user_member, role=Membership.Role.MEMBER)
        # self.user_other is NOT in tenant
        
        self.project = Project.objects.create(tenant=self.tenant, name="Project", created_by=self.user_admin)
        # Creator is auto-added as ADMIN in perform_create, but let's manually add for test if needed or assume it works
        ProjectMember.objects.get_or_create(tenant=self.tenant, project=self.project, user=self.user_admin, defaults={"role": ProjectMember.Role.ADMIN})

        token = RefreshToken.for_user(self.user_admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_add_workspace_member_to_project(self):
        url = reverse("project-members", kwargs={"pk": self.project.id})
        data = {"user_id": str(self.user_member.id), "role": "member"}
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ProjectMember.objects.filter(project=self.project, user=self.user_member).exists())

    def test_cannot_add_non_workspace_member(self):
        url = reverse("project-members", kwargs={"pk": self.project.id})
        data = {"user_id": str(self.user_other.id), "role": "member"}
        response = self.client.post(url, data, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_member_unassigns_tasks(self):
        ProjectMember.objects.create(tenant=self.tenant, project=self.project, user=self.user_member, role="member")
        task = Task.objects.create(tenant=self.tenant, project=self.project, created_by=self.user_admin, assignee=self.user_member, title="Task")
        
        url = reverse("project-remove-member", kwargs={"pk": self.project.id, "user_id": self.user_member.id})
        response = self.client.delete(url, HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        task.refresh_from_db()
        self.assertIsNone(task.assignee)

    def test_regular_member_cannot_manage_members(self):
        token = RefreshToken.for_user(self.user_member)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")
        
        url = reverse("project-members", kwargs={"pk": self.project.id})
        response = self.client.post(url, {"user_id": str(self.user_admin.id)}, format="json", HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
