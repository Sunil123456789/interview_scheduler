# Create your views here.
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from accounts.models import Candidate, Area, AOM
from .tasks import schedule_interview_task
from .models import Interview
from django.db.models import Count, Q
from .permissions import IsHRAdmin

logger = logging.getLogger(__name__)


class InterviewsListView(APIView):
    """GET /api/interviews/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("Fetching all interviews")
        interviews = Interview.objects.all().order_by('-created_at')
        data = [
            {
                'id': interview.id,
                'candidate': interview.candidate.name,
                'status': interview.status,
                'scheduled_start': interview.scheduled_start,
                'scheduled_end': interview.scheduled_end,
                'meet_link': interview.meet_link,
                'same_area_aom': str(interview.same_area_aom) if interview.same_area_aom else None,
                'diff_area_aom': str(interview.diff_area_aom) if interview.diff_area_aom else None,
                'failure_reason': interview.failure_reason,
                'created_at': interview.created_at,
            }
            for interview in interviews
        ]
        return Response({'interviews': data, 'count': len(data)})


class ScheduleInterviewView(APIView):
    """
    POST /api/schedule-interview/
    Body: {"candidate_id": 123}
    """
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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


class AreasListCreateView(APIView):
    """GET/POST /api/areas/"""
    permission_classes = [IsHRAdmin]

    def get(self, request):
        logger.info("Fetching all areas")
        areas = Area.objects.all()
        data = [
            {
                'id': area.id,
                'name': area.name,
                'aom_count': area.aoms.count(),
            }
            for area in areas
        ]
        return Response({'areas': data, 'count': len(data)})

    def post(self, request):
        name = request.data.get('name')
        if not name:
            return Response({'error': 'name required'}, status=400)

        area, created = Area.objects.get_or_create(name=name)
        logger.info(f"Area {name} {'created' if created else 'already exists'}")
        return Response({
            'id': area.id,
            'name': area.name,
            'created': created
        }, status=201 if created else 200)


class AOmsListCreateView(APIView):
    """GET/POST /api/aoms/"""
    permission_classes = [IsHRAdmin]

    def get(self, request):
        logger.info("Fetching all AOMs")
        aoms = AOM.objects.all()
        data = [
            {
                'id': aom.id,
                'username': aom.username,
                'first_name': aom.first_name,
                'last_name': aom.last_name,
                'email': aom.email,
                'area': aom.area.name if aom.area else None,
                'has_oauth_tokens': bool(aom.google_access_token),
            }
            for aom in aoms
        ]
        return Response({'aoms': data, 'count': len(data)})

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        area_id = request.data.get('area_id')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response({'error': 'username, email, password required'}, status=400)

        if AOM.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=400)

        area = None
        if area_id:
            try:
                area = Area.objects.get(id=area_id)
            except Area.DoesNotExist:
                return Response({'error': f'Area {area_id} not found'}, status=404)

        aom = AOM.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        aom.area = area
        aom.save()
        logger.info(f"AOM {username} created")
        return Response({
            'id': aom.id,
            'username': aom.username,
            'email': aom.email,
            'area': area.name if area else None,
        }, status=201)


class CandidatesListCreateView(APIView):
    """GET/POST /api/candidates/"""
    permission_classes = [IsHRAdmin]

    def get(self, request):
        logger.info("Fetching all candidates")
        candidates = Candidate.objects.all()
        data = [
            {
                'id': candidate.id,
                'name': candidate.name,
                'email': candidate.email,
                'area': candidate.area.name if candidate.area else None,
                'applied_at': candidate.applied_at,
            }
            for candidate in candidates
        ]
        return Response({'candidates': data, 'count': len(data)})

    def post(self, request):
        name = request.data.get('name')
        email = request.data.get('email')
        area_id = request.data.get('area_id')

        if not name or not email:
            return Response({'error': 'name and email required'}, status=400)

        area = None
        if area_id:
            try:
                area = Area.objects.get(id=area_id)
            except Area.DoesNotExist:
                return Response({'error': f'Area {area_id} not found'}, status=404)

        candidate = Candidate.objects.create(
            name=name,
            email=email,
            area=area
        )
        logger.info(f"Candidate {name} created")
        return Response({
            'id': candidate.id,
            'name': candidate.name,
            'email': candidate.email,
            'area': area.name if area else None,
        }, status=201)


class AnalyticsView(APIView):
    """GET /api/analytics/"""
    permission_classes = [IsHRAdmin]

    def get(self, request):
        logger.info("Fetching analytics")
        total_candidates = Candidate.objects.count()
        total_areas = Area.objects.count()
        total_aoms = AOM.objects.count()
        total_interviews = Interview.objects.count()
        scheduled = Interview.objects.filter(status='scheduled').count()
        failed = Interview.objects.filter(status='failed').count()
        pending = Interview.objects.filter(status='pending').count()
        completed = Interview.objects.filter(status='completed').count()

        success_rate = 0
        if total_interviews > 0:
            success_rate = round((scheduled / total_interviews) * 100, 2)

        return Response({
            'summary': {
                'total_candidates': total_candidates,
                'total_areas': total_areas,
                'total_aoms': total_aoms,
                'total_interviews': total_interviews,
            },
            'interview_stats': {
                'scheduled': scheduled,
                'failed': failed,
                'pending': pending,
                'completed': completed,
                'success_rate': success_rate,
            }
        })
