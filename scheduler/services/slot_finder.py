import datetime
import logging
from typing import Optional
from accounts.models import AOM
from .google_calendar import get_busy_slots

logger = logging.getLogger(__name__)

INTERVIEW_DURATION = datetime.timedelta(hours=1)
WORK_START_HOUR = 9   # 9 AM UTC
WORK_END_HOUR = 18    # 6 PM UTC
SLOT_STEP = datetime.timedelta(minutes=30)
SEARCH_DAYS = 7


def is_slot_free(slot_start: datetime.datetime, slot_end: datetime.datetime, busy: list) -> bool:
    """Check if [slot_start, slot_end) overlaps any busy window."""
    for b in busy:
        if slot_start < b['end'] and slot_end > b['start']:
            return False
    return True


def find_common_slot(
    aom1: AOM,
    aom2: AOM,
    search_from: datetime.datetime = None,
) -> Optional[dict]:
    """
    Finds the earliest common free slot for two AOMs within SEARCH_DAYS.
    Returns {'start': datetime, 'end': datetime} or None.
    """
    if search_from is None:
        search_from = datetime.datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    logger.info("Searching for common slot between %s and %s starting %s", aom1, aom2, search_from)

    time_max = search_from + datetime.timedelta(days=SEARCH_DAYS)

    busy1 = get_busy_slots(aom1, search_from, time_max)
    busy2 = get_busy_slots(aom2, search_from, time_max)

    current = search_from
    while current < time_max:
        # Skip outside working hours
        if current.hour < WORK_START_HOUR:
            current = current.replace(hour=WORK_START_HOUR, minute=0)
            continue
        if current.hour >= WORK_END_HOUR:
            # Jump to next day
            current = (current + datetime.timedelta(days=1)).replace(hour=WORK_START_HOUR, minute=0)
            continue
        # Skip weekends
        if current.weekday() >= 5:
            current = (current + datetime.timedelta(days=1)).replace(hour=WORK_START_HOUR, minute=0)
            continue

        slot_end = current + INTERVIEW_DURATION
        if slot_end.hour > WORK_END_HOUR:
            current += SLOT_STEP
            continue

        if is_slot_free(current, slot_end, busy1) and is_slot_free(current, slot_end, busy2):
            return {'start': current, 'end': slot_end}

        current += SLOT_STEP

    return None  # No slot found