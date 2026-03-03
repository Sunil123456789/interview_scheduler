import datetime
from unittest import mock

from django.test import TestCase
from django.utils import timezone
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

        self.assertIsNotNone(slot)
        self.assertEqual(slot["start"], start)
        self.assertEqual(
            slot["end"],
            start + datetime.timedelta(hours=1),
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
        )
        self.diff_aom = AOM.objects.create_user(
            username="diff",
            password="pass",
            area=self.area_diff,
            email="diff@example.com",
            is_active=True,
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


class APITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.area = Area.objects.create(name="Central")
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
