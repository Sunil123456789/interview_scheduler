from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from google_auth_oauthlib.flow import Flow
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


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


@login_required
def google_auth_start(request):
    flow = Flow.from_client_secrets_file(
        'client_secrets.json',
        scopes=SCOPES,
        redirect_uri=request.build_absolute_uri('/auth/callback/'),
    )
    auth_url, state = flow.authorization_url(access_type='offline', prompt='consent')
    request.session['oauth_state'] = state
    return redirect(auth_url)


@login_required
def google_auth_callback(request):
    flow = Flow.from_client_secrets_file(
        'client_secrets.json',
        scopes=SCOPES,
        state=request.session['oauth_state'],
        redirect_uri=request.build_absolute_uri('/auth/callback/'),
    )
    flow.fetch_token(authorization_response=request.build_absolute_uri())
    creds = flow.credentials

    aom = request.user
    aom.google_access_token = creds.token
    aom.google_refresh_token = creds.refresh_token
    aom.token_expiry = creds.expiry
    aom.save()
    return redirect('/admin/')