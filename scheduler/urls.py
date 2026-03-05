from django.urls import path
from .views import (
    ScheduleInterviewView, InterviewStatusView, InterviewsListView,
    AreasListCreateView, AreaDetailView, AOmsListCreateView, AOMDetailView,
    CandidatesListCreateView, CandidateDetailView,
    AnalyticsView, UsersListCreateView
)

urlpatterns = [
    path('schedule-interview/', ScheduleInterviewView.as_view()),
    path('interviews/', InterviewsListView.as_view()),
    path('interviews/<int:pk>/', InterviewStatusView.as_view()),
    path('areas/', AreasListCreateView.as_view()),
    path('areas/<int:pk>/', AreaDetailView.as_view()),
    path('aoms/', AOmsListCreateView.as_view()),
    path('aoms/<int:pk>/', AOMDetailView.as_view()),
    path('users/', UsersListCreateView.as_view()),
    path('candidates/', CandidatesListCreateView.as_view()),
    path('candidates/<int:pk>/', CandidateDetailView.as_view()),
    path('analytics/', AnalyticsView.as_view()),
]
