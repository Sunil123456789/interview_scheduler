import random
from accounts.models import AOM, Candidate
from scheduler.models import Interview
from .slot_finder import find_common_slot
from .google_calendar import create_calendar_event


def pick_aoms(candidate: Candidate):
    """
    Returns (same_area_aom, diff_area_aom) or raises ValueError.
    """
    same_area_aoms = list(AOM.objects.filter(area=candidate.area, is_active=True))
    diff_area_aoms = list(AOM.objects.exclude(area=candidate.area).filter(is_active=True))

    if not same_area_aoms:
        raise ValueError(f"No AOM found in candidate's area: {candidate.area}")
    if not diff_area_aoms:
        raise ValueError("No AOM found outside candidate's area")

    return random.choice(same_area_aoms), random.choice(diff_area_aoms)


def schedule_interview(candidate_id: int) -> Interview:
    """
    Main entry point:
    1. Pick AOMs
    2. Find common slot
    3. Create Google Calendar event
    4. Save Interview record
    """
    candidate = Candidate.objects.get(id=candidate_id)

    interview = Interview.objects.create(candidate=candidate, status='pending')

    try:
        same_aom, diff_aom = pick_aoms(candidate)
        interview.same_area_aom = same_aom
        interview.diff_area_aom = diff_aom

        slot = find_common_slot(same_aom, diff_aom)
        if not slot:
            interview.status = 'failed'
            interview.failure_reason = 'No common free slot found in next 7 days'
            interview.save()
            # Notify admin
            from django.core.mail import mail_admins
            mail_admins(
                subject=f'Interview scheduling failed: {candidate.name}',
                message=f'No common slot found for {same_aom} and {diff_aom}.'
            )
            return interview

        event = create_calendar_event(
            aom1=same_aom,
            aom2=diff_aom,
            candidate_email=candidate.email,
            start=slot['start'],
            end=slot['end'],
            summary=f'Interview: {candidate.name}',
        )

        interview.scheduled_start = slot['start']
        interview.scheduled_end = slot['end']
        interview.google_event_id = event.get('id', '')
        interview.meet_link = event.get('hangoutLink', '')
        interview.status = 'scheduled'
        interview.save()

    except Exception as e:
        interview.status = 'failed'
        interview.failure_reason = str(e)
        interview.save()
        raise

    return interview