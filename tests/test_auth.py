from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tenants.models import Membership


class AuthTests(APITestCase):
    def test_register_with_workspace(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "owner@example.com",
                "password": "StrongPass1",
                "first_name": "Owner",
                "last_name": "User",
                "create_workspace": True,
                "workspace_name": "Acme Corp",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIsNotNone(response.data["workspace"])
        self.assertEqual(Membership.objects.count(), 1)
        self.assertEqual(Membership.objects.first().role, Membership.Role.OWNER)

    def test_login_returns_tokens(self):
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
