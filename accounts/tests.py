from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import Area, Candidate


User = get_user_model()


class AOMAndCandidateModelTests(TestCase):
    def test_create_area_aom_and_candidate(self):
        area = Area.objects.create(name="North")
        aom = User.objects.create_user(
            username="aom1",
            password="pass1234",
            area=area,
            email="aom1@example.com",
        )
        candidate = Candidate.objects.create(
            name="John Doe",
            email="john@example.com",
            area=area,
        )

        self.assertEqual(str(area), "North")
        self.assertIn(area, aom.area.__class__.objects.all())
        self.assertEqual(str(candidate), "John Doe - North")
