import logging
import base64
import hashlib
import secrets
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django.conf import settings
from django.core import signing
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AOM


logger = logging.getLogger(__name__)


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_superuser:
            role = 'superadmin'
        elif user.is_staff:
            role = 'admin'
        else:
            role = 'user'

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'role': role,
            'permissions': sorted(list(user.get_all_permissions())),
        })


SCOPES = ['https://www.googleapis.com/auth/calendar']


def _build_google_flow(*, state=None):
    client_secrets_file = Path(settings.GOOGLE_OAUTH_CLIENT_SECRETS_FILE)
    if client_secrets_file.exists():
        return Flow.from_client_secrets_file(
            str(client_secrets_file),
            scopes=SCOPES,
            state=state,
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
        )

    if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET:
        return Flow.from_client_config(
            {
                'web': {
                    'client_id': settings.GOOGLE_CLIENT_ID,
                    'client_secret': settings.GOOGLE_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                }
            },
            scopes=SCOPES,
            state=state,
            redirect_uri=settings.GOOGLE_OAUTH_REDIRECT_URI,
        )

    missing = []
    if not settings.GOOGLE_CLIENT_ID:
        missing.append('GOOGLE_CLIENT_ID')
    if not settings.GOOGLE_CLIENT_SECRET:
        missing.append('GOOGLE_CLIENT_SECRET')

    raise ValueError(
        'Google OAuth is not configured. '
        f"Missing client secrets file at '{client_secrets_file}' and missing env vars: {', '.join(missing) if missing else 'none'}."
    )


def _error_redirect(message):
    return redirect(_with_query(settings.GOOGLE_OAUTH_FAILURE_REDIRECT, reason=message))


def _with_query(url, **params):
    parts = urlsplit(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update({k: str(v) for k, v in params.items()})
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def _safe_error_text(exc):
    # Keep the error short and single-line for URL query usage.
    text = str(exc).replace('\n', ' ').replace('\r', ' ').strip()
    if len(text) > 220:
        text = text[:220] + '...'
    return text or 'Unknown error'


def _pkce_code_challenge(code_verifier):
    digest = hashlib.sha256(code_verifier.encode('ascii')).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode('ascii')


class GoogleAuthStartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        target_user = request.user
        aom_id = request.query_params.get('aom_id')

        if aom_id:
            if not request.user.is_staff:
                return Response({'error': 'Only admin users can connect another AOM'}, status=403)
            try:
                target_user = AOM.objects.get(pk=aom_id, is_interviewer=True)
            except AOM.DoesNotExist:
                return Response({'error': 'AOM not found'}, status=404)

        # PKCE verifier must be reused at token exchange.
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = _pkce_code_challenge(code_verifier)
        state = signing.dumps(
            {
                'target_user_id': target_user.id,
                'actor_user_id': request.user.id,
                'code_verifier': code_verifier,
            },
            salt='google-oauth-state',
        )

        try:
            flow = _build_google_flow(state=state)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)

        auth_url, _ = flow.authorization_url(
            access_type='offline',
            prompt='consent',
            include_granted_scopes='true',
            code_challenge_method='S256',
            code_challenge=code_challenge,
        )

        return Response({
            'auth_url': auth_url,
            'target_user_id': target_user.id,
            'target_username': target_user.username,
        })


class GoogleAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        state = request.query_params.get('state')
        if not state:
            return _error_redirect('Missing OAuth state')

        try:
            payload = signing.loads(
                state,
                salt='google-oauth-state',
                max_age=settings.GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
            )
        except signing.BadSignature:
            return _error_redirect('Invalid or expired OAuth state')

        target_user_id = payload.get('target_user_id')
        if not target_user_id:
            return _error_redirect('Missing target user in OAuth state')

        code_verifier = payload.get('code_verifier')
        if not code_verifier:
            return _error_redirect('Missing PKCE code verifier in OAuth state. Please retry connect.')

        try:
            target_user = AOM.objects.get(pk=target_user_id)
        except AOM.DoesNotExist:
            return _error_redirect('Target AOM not found')

        try:
            flow = _build_google_flow(state=state)
            flow.fetch_token(
                authorization_response=request.build_absolute_uri(),
                code_verifier=code_verifier,
            )
        except ValueError as exc:
            return _error_redirect(str(exc))
        except Exception as exc:
            logger.exception('Google OAuth token exchange failed')
            return _error_redirect(f'Failed to exchange OAuth code for tokens: {_safe_error_text(exc)}')

        creds = flow.credentials
        target_user.google_access_token = creds.token or ''
        if creds.refresh_token:
            target_user.google_refresh_token = creds.refresh_token
        target_user.token_expiry = creds.expiry
        target_user.save(update_fields=['google_access_token', 'google_refresh_token', 'token_expiry'])

        return redirect(_with_query(settings.GOOGLE_OAUTH_SUCCESS_REDIRECT, aom_id=target_user.id))