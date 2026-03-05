from django.urls import path
from .views import (
    ScheduleInterviewView, InterviewStatusView, InterviewsListView,
    AreasListCreateView, AOmsListCreateView, CandidatesListCreateView,
    AnalyticsView
)

urlpatterns = [
    path('schedule-interview/', ScheduleInterviewView.as_view()),
    path('interviews/', InterviewsListView.as_view()),
    path('interviews/<int:pk>/', InterviewStatusView.as_view()),
    path('areas/', AreasListCreateView.as_view()),
    path('aoms/', AOmsListCreateView.as_view()),
    path('candidates/', CandidatesListCreateView.as_view()),
    path('analytics/', AnalyticsView.as_view()),
]
