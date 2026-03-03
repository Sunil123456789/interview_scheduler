from django.urls import path
from .views import ScheduleInterviewView, InterviewStatusView

urlpatterns = [
    path('schedule-interview/', ScheduleInterviewView.as_view()),
    path('interviews/<int:pk>/', InterviewStatusView.as_view()),
]