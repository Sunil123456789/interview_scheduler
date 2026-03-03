# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from accounts.models import Candidate
from .tasks import schedule_interview_task
from .models import Interview


class ScheduleInterviewView(APIView):
    """
    POST /api/schedule-interview/
    Body: {"candidate_id": 123}
    """
    def post(self, request):
        candidate_id = request.data.get('candidate_id')
        if not candidate_id:
            return Response({'error': 'candidate_id required'}, status=400)

        if not Candidate.objects.filter(id=candidate_id).exists():
            return Response({'error': 'Candidate not found'}, status=404)

        task = schedule_interview_task.delay(candidate_id)
        return Response({
            'message': 'Scheduling started',
            'task_id': task.id
        }, status=status.HTTP_202_ACCEPTED)


class InterviewStatusView(APIView):
    """GET /api/interviews/<id>/"""
    def get(self, request, pk):
        try:
            interview = Interview.objects.get(pk=pk)
            return Response({
                'id': interview.id,
                'candidate': interview.candidate.name,
                'status': interview.status,
                'scheduled_start': interview.scheduled_start,
                'scheduled_end': interview.scheduled_end,
                'meet_link': interview.meet_link,
                'same_area_aom': str(interview.same_area_aom),
                'diff_area_aom': str(interview.diff_area_aom),
                'failure_reason': interview.failure_reason,
            })
        except Interview.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)