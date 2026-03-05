from django.contrib.auth import get_user_model
from django.urls.exceptions import NoReverseMatch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from apps.tenants.models import Membership, Tenant, WorkspaceInvite

User = get_user_model()


class InviteFlowTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@acme.com", password="StrongPass1")
        self.invited = User.objects.create_user(email="member@acme.com", password="StrongPass1")
        self.tenant = Tenant.objects.create(name="Acme", slug="acme")
        Membership.objects.create(tenant=self.tenant, user=self.owner, role=Membership.Role.OWNER)
        token = RefreshToken.for_user(self.owner)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_create_preview_accept_invite(self):
        create_res = self.client.post(
            reverse("workspace-invite-list-create"),
            {"email": self.invited.email, "role": Membership.Role.MEMBER},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        token = create_res.data["token"]

        self.client.credentials()
        preview_res = self.client.get(reverse("workspace-invite-preview", kwargs={"token": token}))
        self.assertEqual(preview_res.status_code, status.HTTP_200_OK)
        self.assertTrue(preview_res.data["valid"])

        invited_token = RefreshToken.for_user(self.invited)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {invited_token.access_token}")
        accept_res = self.client.post(reverse("workspace-invite-accept"), {"token": token}, format="json")
        self.assertEqual(accept_res.status_code, status.HTTP_200_OK)
        self.assertTrue(Membership.objects.filter(tenant=self.tenant, user=self.invited).exists())

    def test_register_with_invite_token(self):
        create_res = self.client.post(
            reverse("workspace-invite-list-create"),
            {"email": "new-user@acme.com", "role": Membership.Role.ADMIN},
            format="json",
            HTTP_X_TENANT=self.tenant.slug,
        )
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        token = create_res.data["token"]

        self.client.credentials()
        register_res = self.client.post(
            reverse("auth-register"),
            {
                "email": "new-user@acme.com",
                "password": "StrongPass1",
                "first_name": "New",
                "last_name": "User",
                "invite_token": token,
            },
            format="json",
        )
        self.assertEqual(register_res.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="new-user@acme.com")
        membership = Membership.objects.get(tenant=self.tenant, user=user)
        self.assertEqual(membership.role, Membership.Role.ADMIN)
        self.assertGreaterEqual(Membership.objects.filter(user=user).count(), 2)
        self.assertTrue(register_res.data.get("active_workspace"))
        self.assertIsNotNone(WorkspaceInvite.objects.get(token=token).accepted_at)


class BillingWebhookRemovedTests(APITestCase):
    def test_billing_webhook_endpoint_not_registered(self):
        with self.assertRaises(NoReverseMatch):
            reverse("billing-webhook")
