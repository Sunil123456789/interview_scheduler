import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "interview_scheduler.settings")

app = Celery("interview_scheduler")

# Load settings from Django settings module, using CELERY_ prefix
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks.py in installed apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

