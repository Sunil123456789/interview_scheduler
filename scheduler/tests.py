import datetime
from unittest import mock

from django.test import TestCase
from django.utils import timezone
from googleapiclient.errors import HttpError
from rest_framework.test import APIClient

from accounts.models import Area, AOM, Candidate
from .models import Interview
from .services import slot_finder, interview_booker
from .tasks import schedule_interview_task


class SlotFinderTests(TestCase):
    def setUp(self):
        area = Area.objects.create(name="West")
        self.aom1 = AOM.objects.create_user(
            username="aom_w1",
            password="pass",
            area=area,
            email="w1@example.com",
            is_active=True,
        )
        self.aom2 = AOM.objects.create_user(
            username="aom_w2",
            password="pass",
            area=area,
            email="w2@example.com",
            is_active=True,
        )

    @mock.patch("scheduler.services.slot_finder.get_busy_slots")
    def test_find_common_slot_when_both_free(self, mock_busy):
        mock_busy.return_value = []
        start = datetime.datetime(2026, 3, 3, 9, 0, 0)

        slot = slot_finder.find_common_slot(self.aom1, self.aom2, search_from=start)
        expected_start = timezone.make_aware(start, timezone.get_current_timezone())

        self.assertIsNotNone(slot)
        self.assertEqual(slot["start"], expected_start)
        self.assertEqual(
            slot["end"],
            expected_start + datetime.timedelta(hours=1),
        )


class PickAOMsTests(TestCase):
    def setUp(self):
        self.area_same = Area.objects.create(name="Same")
        self.area_diff = Area.objects.create(name="Diff")
        self.candidate = Candidate.objects.create(
            name="Jane",
            email="jane@example.com",
            area=self.area_same,
        )

    def test_pick_aoms_success(self):
        same = AOM.objects.create_user(
            username="same1",
            password="pass",
            area=self.area_same,
            email="same1@example.com",
            is_active=True,
        )
        diff = AOM.objects.create_user(
            username="diff1",
            password="pass",
            area=self.area_diff,
            email="diff1@example.com",
            is_active=True,
        )

        aom_same, aom_diff = interview_booker.pick_aoms(self.candidate)

        self.assertEqual(aom_same.area, self.area_same)
        self.assertNotEqual(aom_diff.area, self.area_same)
        self.assertIn(aom_same, [same])
        self.assertIn(aom_diff, [diff])

    def test_pick_aoms_no_same_area_raises(self):
        AOM.objects.create_user(
            username="diff_only",
            password="pass",
            area=self.area_diff,
            email="diff_only@example.com",
            is_active=True,
        )

        with self.assertRaises(ValueError):
            interview_booker.pick_aoms(self.candidate)

    def test_pick_aoms_no_diff_area_raises(self):
        AOM.objects.create_user(
            username="same_only",
            password="pass",
            area=self.area_same,
            email="same_only@example.com",
            is_active=True,
        )

        with self.assertRaises(ValueError):
            interview_booker.pick_aoms(self.candidate)


class ScheduleInterviewServiceTests(TestCase):
    def setUp(self):
        self.area_same = Area.objects.create(name="Same")
        self.area_diff = Area.objects.create(name="Diff")
        self.candidate = Candidate.objects.create(
            name="Jane",
            email="jane@example.com",
            area=self.area_same,
        )
        self.same_aom = AOM.objects.create_user(
            username="same",
            password="pass",
            area=self.area_same,
            email="same@example.com",
            is_active=True,
            google_access_token='token-same',
        )
        self.diff_aom = AOM.objects.create_user(
            username="diff",
            password="pass",
            area=self.area_diff,
            email="diff@example.com",
            is_active=True,
            google_access_token='token-diff',
        )

    @mock.patch("scheduler.services.interview_booker.create_calendar_event")
    @mock.patch("scheduler.services.interview_booker.find_common_slot")
    @mock.patch("scheduler.services.interview_booker.pick_aoms")
    def test_schedule_interview_success(
        self, mock_pick_aoms, mock_find_slot, mock_create_event
    ):
        mock_pick_aoms.return_value = (self.same_aom, self.diff_aom)

        start = datetime.datetime(2026, 3, 3, 9, 0, 0)
        end = start + datetime.timedelta(hours=1)
        mock_find_slot.return_value = {"start": start, "end": end}
        mock_create_event.return_value = {
            "id": "event123",
            "hangoutLink": "https://meet.google.com/xyz",
        }

        interview = interview_booker.schedule_interview(self.candidate.id)

        interview.refresh_from_db()
        self.assertEqual(interview.status, "scheduled")
        self.assertEqual(interview.scheduled_start, timezone.make_aware(start))
        self.assertEqual(interview.scheduled_end, timezone.make_aware(end))
        self.assertEqual(interview.google_event_id, "event123")
        self.assertEqual(interview.meet_link, "https://meet.google.com/xyz")

    @mock.patch("django.core.mail.mail_admins")
    @mock.patch("scheduler.services.interview_booker.find_common_slot")
    @mock.patch("scheduler.services.interview_booker.pick_aoms")
    def test_schedule_interview_no_slot_sets_failed(
        self, mock_pick_aoms, mock_find_slot, mock_mail_admins
    ):
        mock_pick_aoms.return_value = (self.same_aom, self.diff_aom)
        mock_find_slot.return_value = None

        interview = interview_booker.schedule_interview(self.candidate.id)

        interview.refresh_from_db()
        self.assertEqual(interview.status, "failed")
        self.assertIn("No common free slot", interview.failure_reason)
        mock_mail_admins.assert_called_once()


class CeleryTaskTests(TestCase):
    @mock.patch("scheduler.tasks.schedule_interview")
    def test_schedule_interview_task_returns_payload(self, mock_schedule):
        interview = mock.Mock(spec=Interview)
        interview.status = "scheduled"
        interview.id = 42
        interview.meet_link = "https://meet.google.com/test"
        mock_schedule.return_value = interview

        result = schedule_interview_task(1)

        self.assertEqual(
            result,
            {
                "status": "scheduled",
                "interview_id": 42,
                "meet_link": "https://meet.google.com/test",
            },
        )

    @mock.patch("scheduler.tasks.schedule_interview")
    @mock.patch("scheduler.tasks.schedule_interview_task.retry")
    def test_schedule_interview_task_does_not_retry_google_4xx(self, mock_retry, mock_schedule):
        response = mock.Mock()
        response.status = 403
        mock_schedule.side_effect = HttpError(response, b'{"error":"accessNotConfigured"}')

        result = schedule_interview_task(1)

        self.assertEqual(result["status"], "failed")
        self.assertTrue(result["non_retryable"])
        mock_retry.assert_not_called()

    @mock.patch("scheduler.tasks.schedule_interview")
    @mock.patch("scheduler.tasks.schedule_interview_task.retry")
    def test_schedule_interview_task_retries_generic_exception(self, mock_retry, mock_schedule):
        mock_schedule.side_effect = RuntimeError("temporary issue")
        mock_retry.side_effect = Exception("retry called")

        with self.assertRaises(Exception):
            schedule_interview_task(1)

        mock_retry.assert_called_once()


class APITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Central")
        self.user = AOM.objects.create_user(
            username="api_user",
            password="pass1234",
            email="api_user@example.com",
            area=self.area,
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)
        self.candidate = Candidate.objects.create(
            name="John",
            email="john@example.com",
            area=self.area,
        )

    @mock.patch("scheduler.views.schedule_interview_task")
    def test_schedule_interview_endpoint_enqueues_task(self, mock_task):
        mock_task.delay.return_value.id = "task123"

        url = "/api/schedule-interview/"
        response = self.client.post(url, {"candidate_id": self.candidate.id}, format="json")

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["message"], "Scheduling started")
        self.assertEqual(response.data["task_id"], "task123")
        mock_task.delay.assert_called_once_with(self.candidate.id)

    def test_schedule_interview_endpoint_requires_candidate_id(self):
        url = "/api/schedule-interview/"
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_schedule_interview_endpoint_404_for_missing_candidate(self):
        url = "/api/schedule-interview/"
        response = self.client.post(url, {"candidate_id": 999}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_interview_status_endpoint(self):
        interview = Interview.objects.create(candidate=self.candidate, status="pending")

        url = f"/api/interviews/{interview.id}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], interview.id)
        self.assertEqual(response.data["candidate"], self.candidate.name)

    def test_interview_status_endpoint_404(self):
        url = "/api/interviews/999/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_schedule_endpoint_requires_authentication(self):
        client = APIClient()
        response = client.post("/api/schedule-interview/", {"candidate_id": self.candidate.id}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_schedule_endpoint_rejects_disabled_candidate(self):
        self.candidate.is_active = False
        self.candidate.save()
        response = self.client.post("/api/schedule-interview/", {"candidate_id": self.candidate.id}, format="json")
        self.assertEqual(response.status_code, 400)


class AdminFeatureAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area_1 = Area.objects.create(name="North")
        self.area_2 = Area.objects.create(name="South")

        self.hr_user = AOM.objects.create_user(
            username="hr_admin",
            password="pass1234",
            area=self.area_1,
            email="hr@example.com",
            is_staff=True,
            is_interviewer=False,
            is_active=True,
        )
        self.client.force_authenticate(user=self.hr_user)

        self.aom_1 = AOM.objects.create_user(
            username="north_manager",
            password="pass1234",
            area=self.area_1,
            email="north@example.com",
            first_name="North",
            last_name="Manager",
            is_active=True,
        )
        self.aom_2 = AOM.objects.create_user(
            username="south_manager",
            password="pass1234",
            area=self.area_2,
            email="south@example.com",
            first_name="South",
            last_name="Manager",
            is_active=True,
        )

        self.candidate = Candidate.objects.create(
            name="Candidate One",
            email="candidate1@example.com",
            area=self.area_1,
        )

    def test_interviews_list_endpoint_returns_count(self):
        Interview.objects.create(candidate=self.candidate, status="pending")
        url = "/api/interviews/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["interviews"][0]["candidate"], self.candidate.name)

    def test_areas_get_endpoint(self):
        url = "/api/areas/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        area_names = [item["name"] for item in response.data["areas"]]
        self.assertIn("North", area_names)
        self.assertIn("South", area_names)

    def test_areas_post_creates_new_area(self):
        url = "/api/areas/"
        response = self.client.post(url, {"name": "East"}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Area.objects.filter(name="East").exists())

    def test_areas_post_requires_name(self):
        url = "/api/areas/"
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_areas_patch_can_update_and_disable(self):
        url = f"/api/areas/{self.area_1.id}/"
        payload = {
            "name": "North Updated",
            "is_active": False,
        }
        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.area_1.refresh_from_db()
        self.assertEqual(self.area_1.name, "North Updated")
        self.assertFalse(self.area_1.is_active)

    def test_areas_delete_removes_record(self):
        url = f"/api/areas/{self.area_2.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Area.objects.filter(id=self.area_2.id).exists())

    def test_aoms_get_endpoint(self):
        url = "/api/aoms/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(response.data["aoms"][0]["has_oauth_tokens"], False)

    def test_aoms_post_creates_new_aom(self):
        url = "/api/aoms/"
        payload = {
            "username": "new_aom",
            "email": "new_aom@example.com",
            "password": "safe-pass-123",
            "first_name": "New",
            "last_name": "Aom",
            "area_id": self.area_1.id,
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        created = AOM.objects.get(username="new_aom")
        self.assertEqual(created.area, self.area_1)
        self.assertEqual(created.email, "new_aom@example.com")

    def test_users_post_can_create_staff_user(self):
        url = "/api/users/"
        payload = {
            "username": "admin_user",
            "email": "admin_user@example.com",
            "password": "safe-pass-123",
            "first_name": "Admin",
            "last_name": "User",
            "role": "admin",
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["role"], "admin")
        created = AOM.objects.get(username="admin_user")
        self.assertTrue(created.is_staff)
        self.assertFalse(created.is_interviewer)

    def test_users_get_endpoint(self):
        url = "/api/users/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["users"][0]["username"], "hr_admin")

    def test_aoms_post_requires_fields(self):
        url = "/api/aoms/"
        response = self.client.post(url, {"username": "x"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_aoms_post_rejects_duplicate_username(self):
        url = "/api/aoms/"
        payload = {
            "username": "north_manager",
            "email": "another@example.com",
            "password": "safe-pass-123",
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_aoms_post_invalid_area_returns_404(self):
        url = "/api/aoms/"
        payload = {
            "username": "ghost_aom",
            "email": "ghost@example.com",
            "password": "safe-pass-123",
            "area_id": 99999,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 404)

    def test_aoms_patch_can_update_and_disable(self):
        url = f"/api/aoms/{self.aom_1.id}/"
        payload = {
            "first_name": "Updated",
            "is_active": False,
        }
        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.aom_1.refresh_from_db()
        self.assertEqual(self.aom_1.first_name, "Updated")
        self.assertFalse(self.aom_1.is_active)

    def test_aoms_delete_removes_record(self):
        url = f"/api/aoms/{self.aom_2.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(AOM.objects.filter(id=self.aom_2.id).exists())

    def test_candidates_get_endpoint(self):
        url = "/api/candidates/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["candidates"][0]["name"], "Candidate One")

    def test_candidates_post_creates_candidate(self):
        url = "/api/candidates/"
        payload = {
            "name": "Candidate Two",
            "email": "candidate2@example.com",
            "area_id": self.area_2.id,
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Candidate.objects.filter(email="candidate2@example.com").exists())

    def test_candidates_post_requires_fields(self):
        url = "/api/candidates/"
        response = self.client.post(url, {"name": "OnlyName"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_candidates_post_invalid_area_returns_404(self):
        url = "/api/candidates/"
        payload = {
            "name": "Candidate X",
            "email": "candidatex@example.com",
            "area_id": 99999,
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 404)

    def test_candidates_patch_can_update_and_disable(self):
        url = f"/api/candidates/{self.candidate.id}/"
        payload = {
            "name": "Candidate Updated",
            "is_active": False,
        }
        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.name, "Candidate Updated")
        self.assertFalse(self.candidate.is_active)

    def test_candidates_delete_removes_record(self):
        url = f"/api/candidates/{self.candidate.id}/"
        response = self.client.delete(url)

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Candidate.objects.filter(id=self.candidate.id).exists())

    def test_analytics_endpoint_returns_expected_counts(self):
        Interview.objects.create(candidate=self.candidate, status="scheduled")
        Interview.objects.create(candidate=self.candidate, status="failed")

        url = "/api/analytics/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["total_candidates"], 1)
        self.assertEqual(response.data["summary"]["total_areas"], 2)
        self.assertEqual(response.data["summary"]["total_aoms"], 2)
        self.assertEqual(response.data["summary"]["total_interviews"], 2)
        self.assertEqual(response.data["interview_stats"]["scheduled"], 1)
        self.assertEqual(response.data["interview_stats"]["failed"], 1)
        self.assertEqual(response.data["interview_stats"]["success_rate"], 50.0)

    def test_admin_endpoints_require_staff_user(self):
        non_staff = AOM.objects.create_user(
            username="regular_user",
            password="pass1234",
            email="regular@example.com",
            area=self.area_1,
            is_staff=False,
            is_active=True,
        )
        client = APIClient()
        client.force_authenticate(user=non_staff)

        response = client.get('/api/areas/')
        self.assertEqual(response.status_code, 403)
