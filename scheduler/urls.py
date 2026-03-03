from django.urls import path
from .views import ScheduleInterviewView, InterviewStatusView, InterviewsListView

urlpatterns = [
    path('schedule-interview/', ScheduleInterviewView.as_view()),
    path('interviews/', InterviewsListView.as_view()),
    path('interviews/<int:pk>/', InterviewStatusView.as_view()),
]