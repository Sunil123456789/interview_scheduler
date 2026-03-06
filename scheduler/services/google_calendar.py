import datetime
from django.conf import settings
from django.utils import timezone
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from accounts.models import AOM


def get_credentials(aom: AOM) -> Credentials:
    """Build OAuth2 credentials from stored tokens."""
    if not aom.google_access_token:
        raise ValueError(f"AOM {aom.username} has no Google access token")
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise ValueError('Google client credentials are not configured in settings')

    creds = Credentials(
        token=aom.google_access_token,
        refresh_token=aom.google_refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        # Save refreshed token
        aom.google_access_token = creds.token
        aom.token_expiry = creds.expiry
        aom.save(update_fields=['google_access_token', 'token_expiry'])
    return creds


def get_busy_slots(aom: AOM, time_min: datetime.datetime, time_max: datetime.datetime) -> list:
    """
    Returns list of busy time windows for an AOM.
    Each item: {'start': datetime, 'end': datetime}
    """
    creds = get_credentials(aom)
    service = build('calendar', 'v3', credentials=creds, cache_discovery=False)

    if timezone.is_naive(time_min):
        time_min = timezone.make_aware(time_min, timezone.get_current_timezone())
    if timezone.is_naive(time_max):
        time_max = timezone.make_aware(time_max, timezone.get_current_timezone())

    body = {
        "timeMin": time_min.isoformat(),
        "timeMax": time_max.isoformat(),
        "items": [{"id": aom.google_calendar_id}]
    }
    result = service.freebusy().query(body=body).execute()
    busy_list = result['calendars'][aom.google_calendar_id]['busy']

    return [
        {
            'start': datetime.datetime.fromisoformat(b['start'].replace('Z', '+00:00')),
            'end':   datetime.datetime.fromisoformat(b['end'].replace('Z', '+00:00')),
        }
        for b in busy_list
    ]


def create_calendar_event(
    aom1: AOM,
    aom2: AOM,
    candidate_email: str,
    start: datetime.datetime,
    end: datetime.datetime,
    summary: str,
) -> dict:
    """Creates event on aom1's calendar, invites aom2 + candidate."""
    creds = get_credentials(aom1)
    service = build('calendar', 'v3', credentials=creds, cache_discovery=False)

    if timezone.is_naive(start):
        start = timezone.make_aware(start, timezone.get_current_timezone())
    if timezone.is_naive(end):
        end = timezone.make_aware(end, timezone.get_current_timezone())

    event = {
        'summary': summary,
        'description': f'Interview scheduled via Interview Scheduler',
        'start': {'dateTime': start.isoformat(), 'timeZone': settings.TIME_ZONE},
        'end':   {'dateTime': end.isoformat(),   'timeZone': settings.TIME_ZONE},
        'attendees': [
            {'email': aom1.email},
            {'email': aom2.email},
            {'email': candidate_email},
        ],
        'conferenceData': {
            'createRequest': {'requestId': f'interview-{start.timestamp()}'}
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'email', 'minutes': 60},
                {'method': 'popup', 'minutes': 15},
            ],
        },
    }

    created = service.events().insert(
        calendarId='primary',
        body=event,
        conferenceDataVersion=1,
        sendUpdates='all',
    ).execute()

    return created