import datetime
import logging
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from accounts.models import AOM

logger = logging.getLogger(__name__)


def get_credentials(aom: AOM) -> Credentials:
    """Build OAuth2 credentials from stored tokens."""
    creds = Credentials(
        token=aom.google_access_token,
        refresh_token=aom.google_refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id='YOUR_CLIENT_ID',       # move to settings/env
        client_secret='YOUR_CLIENT_SECRET',
    )
    if creds.expired and creds.refresh_token:
        logger.info("Refreshing credentials for %s", aom)
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
    service = build('calendar', 'v3', credentials=creds)

    body = {
        "timeMin": time_min.isoformat() + 'Z',
        "timeMax": time_max.isoformat() + 'Z',
        "items": [{"id": aom.google_calendar_id}]
    }
    result = service.freebusy().query(body=body).execute()
    busy_list = result['calendars'][aom.google_calendar_id]['busy']
    logger.debug("Busy slots for %s between %s and %s: %s", aom, time_min, time_max, busy_list)

    return [
        {
            'start': datetime.datetime.fromisoformat(b['start'].replace('Z', '')),
            'end':   datetime.datetime.fromisoformat(b['end'].replace('Z', '')),
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
    service = build('calendar', 'v3', credentials=creds)

    event = {
        'summary': summary,
        'description': f'Interview scheduled via Interview Scheduler',
        'start': {'dateTime': start.isoformat() + 'Z', 'timeZone': 'UTC'},
        'end':   {'dateTime': end.isoformat() + 'Z',   'timeZone': 'UTC'},
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

    logger.info("Creating calendar event for %s and %s at %s", aom1, aom2, start)
    created = service.events().insert(
        calendarId='primary',
        body=event,
        conferenceDataVersion=1,
        sendUpdates='all',
    ).execute()

    return created