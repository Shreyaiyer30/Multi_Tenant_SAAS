from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.projects.models import Project
from apps.tenants.models import Membership, Tenant

User = get_user_model()


class ProjectDeleteResilienceTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@delete.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Delete Workspace", slug="delete-workspace")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        self.project = Project.objects.create(
            tenant=self.tenant,
            name="Delete Me",
            description="",
            color="#111111",
            created_by=self.owner,
        )

        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_project_delete_survives_unexpected_audit_error(self):
        with patch("apps.audit.services.AuditLog.objects.create", side_effect=ValueError("audit exploded")):
            response = self.client.delete(
                reverse("project-detail", kwargs={"pk": self.project.id}),
                HTTP_X_TENANT=self.tenant.slug,
            )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Project.objects.filter(id=self.project.id).exists())
