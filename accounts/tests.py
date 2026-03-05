from django.test import TestCase
from django.contrib.auth import get_user_model
from django.test.utils import override_settings
from rest_framework.test import APIClient
from unittest import mock

from .models import Area, Candidate


User = get_user_model()


class AOMAndCandidateModelTests(TestCase):
    def test_create_area_aom_and_candidate(self):
        area = Area.objects.create(name="North")
        aom = User.objects.create_user(
            username="aom1",
            password="pass1234",
            area=area,
            email="aom1@example.com",
        )
        candidate = Candidate.objects.create(
            name="John Doe",
            email="john@example.com",
            area=area,
        )

        self.assertEqual(str(area), "North")
        self.assertIn(area, aom.area.__class__.objects.all())
        self.assertEqual(str(candidate), "John Doe - North")


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Auth Area")
        self.user = User.objects.create_user(
            username="auth_user",
            password="pass1234",
            email="auth@example.com",
            area=self.area,
            is_staff=True,
            is_active=True,
        )

    def test_jwt_login_returns_tokens(self):
        response = self.client.post(
            "/api/auth/login/",
            {"username": "auth_user", "password": "pass1234"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_current_user_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, 401)

    def test_current_user_with_jwt_returns_profile(self):
        login_response = self.client.post(
            "/api/auth/login/",
            {"username": "auth_user", "password": "pass1234"},
            format="json",
        )
        access = login_response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], "auth_user")
        self.assertTrue(response.data["is_staff"])

    def test_google_oauth_start_requires_auth(self):
        unauthenticated = APIClient()
        response = unauthenticated.get('/api/auth/google/start/')
        self.assertEqual(response.status_code, 401)

    @mock.patch('accounts.views.Flow')
    @override_settings(
        GOOGLE_CLIENT_ID='test-client-id',
        GOOGLE_CLIENT_SECRET='test-client-secret',
    )
    def test_google_oauth_start_returns_auth_url(self, mock_flow):
        login_response = self.client.post(
            '/api/auth/login/',
            {'username': 'auth_user', 'password': 'pass1234'},
            format='json',
        )
        access = login_response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

        flow_instance = mock.Mock()
        flow_instance.authorization_url.return_value = ('https://accounts.google.com/o/oauth2/v2/auth', 'state')
        mock_flow.from_client_secrets_file.return_value = flow_instance
        mock_flow.from_client_config.return_value = flow_instance

        response = self.client.get('/api/auth/google/start/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('auth_url', response.data)
