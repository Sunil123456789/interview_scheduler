# Create your models here.
from django.db import models
from accounts.models import AOM, Candidate


class Interview(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Scheduling'),
        ('scheduled', 'Scheduled'),
        ('failed', 'Failed to Schedule'),
        ('completed', 'Completed'),
    ]

    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='interviews')
    same_area_aom = models.ForeignKey(AOM, on_delete=models.SET_NULL, null=True, related_name='same_area_interviews')
    diff_area_aom = models.ForeignKey(AOM, on_delete=models.SET_NULL, null=True, related_name='diff_area_interviews')

    scheduled_start = models.DateTimeField(null=True, blank=True)
    scheduled_end = models.DateTimeField(null=True, blank=True)
    google_event_id = models.CharField(max_length=255, blank=True)
    meet_link = models.URLField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Interview: {self.candidate} | {self.status}"