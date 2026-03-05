# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models


class Area(models.Model):
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class AOM(AbstractUser):
    """Area Operation Manager"""
    # True: core AOM used by scheduling engine, False: app user account only.
    is_interviewer = models.BooleanField(default=True)
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True, related_name='aoms')
    google_calendar_id = models.CharField(max_length=255, default='primary')
    # OAuth2 tokens stored here
    google_access_token = models.TextField(blank=True)
    google_refresh_token = models.TextField(blank=True)
    token_expiry = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.area})"


class Candidate(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField()
    area = models.ForeignKey(Area, on_delete=models.SET_NULL, null=True)
    is_active = models.BooleanField(default=True)
    applied_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.area}"