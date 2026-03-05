from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tenants.models import Membership, Tenant


class AuthTests(APITestCase):
    def test_register_always_creates_personal_workspace(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "owner@example.com",
                "password": "StrongPass1",
                "first_name": "Owner",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIsNotNone(response.data["workspace"])
        self.assertTrue(response.data["active_workspace"])
        self.assertGreaterEqual(len(response.data["workspaces"]), 1)
        self.assertEqual(Membership.objects.count(), 1)
        self.assertEqual(Membership.objects.first().role, Membership.Role.OWNER)
        self.assertEqual(Tenant.objects.count(), 1)

    def test_login_returns_tokens_and_workspace_slug(self):
        register = self.client.post(
            reverse("auth-register"),
            {
                "email": "member@example.com",
                "password": "StrongPass1",
                "create_workspace": False,
            },
            format="json",
        )
        self.assertEqual(register.status_code, status.HTTP_201_CREATED)

        response = self.client.post(
            reverse("auth-login"),
            {"email": "member@example.com", "password": "StrongPass1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("active_workspace", response.data)
        self.assertTrue(response.data["active_workspace"])
        self.assertIn("workspaces", response.data)
        self.assertGreaterEqual(len(response.data["workspaces"]), 1)

    def test_login_returns_all_user_workspaces(self):
        register = self.client.post(
            reverse("auth-register"),
            {
                "email": "multi@example.com",
                "password": "StrongPass1",
            },
            format="json",
        )
        self.assertEqual(register.status_code, status.HTTP_201_CREATED)

        primary_slug = register.data["active_workspace"]
        primary = Tenant.objects.get(slug=primary_slug)
        user = Membership.objects.get(tenant=primary, role=Membership.Role.OWNER).user
        secondary = Tenant.objects.create(name="Secondary", slug="secondary")
        Membership.objects.create(tenant=secondary, user=user, role=Membership.Role.MEMBER)

        response = self.client.post(
            reverse("auth-login"),
            {"email": "multi@example.com", "password": "StrongPass1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["active_workspace"], primary_slug)
        self.assertEqual(len(response.data["workspaces"]), 2)
