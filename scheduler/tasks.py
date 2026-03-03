from celery import shared_task
from .services.interview_booker import schedule_interview


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def schedule_interview_task(self, candidate_id: int):
    try:
        interview = schedule_interview(candidate_id)
        return {
            'status': interview.status,
            'interview_id': interview.id,
            'meet_link': interview.meet_link,
        }
    except Exception as exc:
        raise self.retry(exc=exc)