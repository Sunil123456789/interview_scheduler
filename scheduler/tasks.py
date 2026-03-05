import logging

from celery import shared_task
from googleapiclient.errors import HttpError

from .services.interview_booker import schedule_interview


logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def schedule_interview_task(self, candidate_id: int):
    try:
        interview = schedule_interview(candidate_id)
        return {
            'status': interview.status,
            'interview_id': interview.id,
            'meet_link': interview.meet_link,
        }
    except HttpError as exc:
        # Do not retry permanent client-side failures such as API disabled,
        # invalid grant, unauthorized client, or bad request payloads.
        status_code = getattr(getattr(exc, 'resp', None), 'status', None)
        if status_code and 400 <= status_code < 500:
            logger.error('Non-retryable Google API error while scheduling interview: %s', exc)
            return {
                'status': 'failed',
                'interview_id': None,
                'meet_link': '',
                'error': str(exc),
                'non_retryable': True,
            }
        raise self.retry(exc=exc)
    except Exception as exc:
        raise self.retry(exc=exc)