# Create your views here.
# accounts/views.py
from google_auth_oauthlib.flow import Flow
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required

SCOPES = ['https://www.googleapis.com/auth/calendar']

@login_required
def google_auth_start(request):
    flow = Flow.from_client_secrets_file(
        'client_secrets.json',
        scopes=SCOPES,
        redirect_uri=request.build_absolute_uri('/auth/callback/')
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
        redirect_uri=request.build_absolute_uri('/auth/callback/')
    )
    flow.fetch_token(authorization_response=request.build_absolute_uri())
    creds = flow.credentials

    aom = request.user
    aom.google_access_token = creds.token
    aom.google_refresh_token = creds.refresh_token
    aom.token_expiry = creds.expiry
    aom.save()
    return redirect('/admin/')
```

---

## 🔄 Full Flow Summary
```
POST /api/schedule-interview/ {candidate_id: 5}
         │
         ▼
   pick_aoms(candidate)
   → same_area_aom (from Area X)
   → diff_area_aom (from Area Y)
         │
         ▼
   find_common_slot(aom1, aom2)
   → Query Google FreeBusy API for both
   → Walk 9AM-6PM slots in 30min steps
   → Return first mutually free 60-min slot
         │
         ▼
   create_calendar_event(...)
   → Creates event with Google Meet link
   → Sends invites to both AOMs + candidate
         │
         ▼
   Interview.status = 'scheduled'
   → Returns meet_link, scheduled_start
```