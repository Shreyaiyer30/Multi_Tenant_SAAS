from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant

User = get_user_model()


class TenantIsolationTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(email="a@example.com", password="StrongPass1")
        self.user_b = User.objects.create_user(email="b@example.com", password="StrongPass1")

        self.tenant_a = Tenant.objects.create(name="Tenant A", slug="tenant-a")
        self.tenant_b = Tenant.objects.create(name="Tenant B", slug="tenant-b")

        self.membership_a = Membership.objects.create(tenant=self.tenant_a, user=self.user_a, role=Membership.Role.OWNER)
        self.membership_b = Membership.objects.create(tenant=self.tenant_b, user=self.user_b, role=Membership.Role.OWNER)

        token = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(token.access_token)}")

    def test_missing_tenant_header_returns_400(self):
        response = self.client.get(reverse("member-list-create"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "error")

    def test_nonexistent_tenant_slug_returns_404(self):
        response = self.client.get(reverse("member-list-create"), HTTP_X_TENANT="does-not-exist")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "error")

    def test_valid_slug_without_membership_returns_403(self):
        response = self.client.get(reverse("member-list-create"), HTTP_X_TENANT=self.tenant_b.slug)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "error")

    def test_inactive_tenant_returns_403(self):
        self.tenant_a.is_active = False
        self.tenant_a.save(update_fields=["is_active"])

        response = self.client.get(reverse("member-list-create"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "error")

    def test_cross_tenant_membership_read_update_delete_return_404(self):
        response_get = self.client.patch(
            reverse("member-detail", kwargs={"membership_id": self.membership_b.id}),
            {"role": Membership.Role.ADMIN},
            format="json",
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(response_get.status_code, status.HTTP_404_NOT_FOUND)

        response_delete = self.client.delete(
            reverse("member-detail", kwargs={"membership_id": self.membership_b.id}),
            HTTP_X_TENANT=self.tenant_a.slug,
        )
        self.assertEqual(response_delete.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_only_returns_current_tenant_members(self):
        Membership.objects.create(tenant=self.tenant_a, user=self.user_b, role=Membership.Role.MEMBER)

        response = self.client.get(reverse("member-list-create"), HTTP_X_TENANT=self.tenant_a.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        for row in response.data:
            self.assertIn("id", row)
