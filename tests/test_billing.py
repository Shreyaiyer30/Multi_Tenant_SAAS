from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant

User = get_user_model()


class BillingTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@x.com", password="StrongPass1")
        self.member = User.objects.create_user(email="member@x.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        Membership.objects.create(tenant=self.tenant, user=self.member, role=Membership.Role.MEMBER)

    def _auth(self, user):
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_owner_can_view_billing(self):
        self._auth(self.owner)
        response = self.client.get(reverse("billing-status"), HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_cannot_view_billing(self):
        self._auth(self.member)
        response = self.client.get(reverse("billing-status"), HTTP_X_TENANT=self.tenant.slug)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
