from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from carbon.models import Activity, Notification

User = get_user_model()


class NotificationSystemTests(APITestCase):

    def setUp(self):
        # Create users
        self.user1 = User.objects.create_user(
            username="user1@example.com",
            email="user1@example.com",
            password="testpassword123"
        )
        self.user2 = User.objects.create_user(
            username="user2@example.com",
            email="user2@example.com",
            password="testpassword123"
        )

        # Clients
        self.client1 = APIClient()
        self.client2 = APIClient()

        # Get JWT tokens
        response1 = self.client1.post("/api/token/", {
            "email": "user1@example.com",
            "password": "testpassword123"
        })
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.token1 = response1.data["access"]
        self.client1.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token1}")

        response2 = self.client2.post("/api/token/", {
            "email": "user2@example.com",
            "password": "testpassword123"
        })
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.token2 = response2.data["access"]
        self.client2.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token2}")

    def test_rule_1_carbon_alert(self):
        """Rule 1: Create CARBON_ALERT if carbon > 2 kg"""
        # Activity under 2 kg carbon (youtube for 50 mins -> 1.0 kg)
        self.client1.post("/api/activities/", {
            "platform": "youtube",
            "duration": 50
        })
        self.assertFalse(Notification.objects.filter(user=self.user1, type="CARBON_ALERT").exists())

        # Activity over 2 kg carbon (netflix for 100 mins -> 5.0 kg)
        response = self.client1.post("/api/activities/", {
            "platform": "netflix",
            "duration": 100
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify notification created
        alerts = Notification.objects.filter(user=self.user1, type="CARBON_ALERT")
        self.assertEqual(alerts.count(), 1)
        alert = alerts.first()
        self.assertEqual(alert.title, "Carbon Alert")
        self.assertEqual(alert.message, "Your recent activity generated more than 2 kg CO₂ emissions.")

    def test_rule_2_achievements(self):
        """Rule 2: Create ACHIEVEMENT if total activities reach 10, 25, 50, 100"""
        # Create 9 activities (all below 2 kg carbon)
        for i in range(9):
            Activity.objects.create(
                user=self.user1,
                platform="youtube",
                duration=10,
                carbon=0.2
            )

        # No achievement yet
        self.assertFalse(Notification.objects.filter(user=self.user1, type="ACHIEVEMENT").exists())

        # Create 10th activity via API to trigger signal
        self.client1.post("/api/activities/", {
            "platform": "youtube",
            "duration": 10
        })

        # Verify achievement notification created
        achievements = Notification.objects.filter(user=self.user1, type="ACHIEVEMENT")
        self.assertEqual(achievements.count(), 1)
        achievement = achievements.first()
        self.assertEqual(achievement.title, "Achievement Unlocked")
        self.assertEqual(achievement.message, "You have completed 10 tracked activities.")

        # Ensure duplicating avoids double notification for 10
        Activity.objects.create(
            user=self.user1,
            platform="youtube",
            duration=10,
            carbon=0.2
        )
        self.assertEqual(Notification.objects.filter(user=self.user1, type="ACHIEVEMENT").count(), 1)

    def test_rule_3_offset_suggestion(self):
        """Rule 3: Create OFFSET_SUGGESTION if total weekly emissions exceed 10 kg"""
        # Verify no suggestion initially
        self.assertFalse(Notification.objects.filter(user=self.user1, type="OFFSET_SUGGESTION").exists())

        # Post activity causing weekly emissions to exceed 10 kg (netflix, 250 mins -> 12.5 kg)
        response = self.client1.post("/api/activities/", {
            "platform": "netflix",
            "duration": 250
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        suggestions = Notification.objects.filter(user=self.user1, type="OFFSET_SUGGESTION")
        self.assertEqual(suggestions.count(), 1)
        suggestion = suggestions.first()
        self.assertEqual(suggestion.title, "Offset Recommendation")
        self.assertEqual(suggestion.message, "You generated more than 10 kg CO₂ this week. Consider purchasing carbon credits.")

        # Add another activity, verify it does not create a duplicate suggestion within 7 days
        self.client1.post("/api/activities/", {
            "platform": "netflix",
            "duration": 100
        })
        self.assertEqual(Notification.objects.filter(user=self.user1, type="OFFSET_SUGGESTION").count(), 1)

    def test_api_endpoints_and_security(self):
        """Test authentication, list endpoint, mark read, unread count, and security/isolation"""
        # Create a notification for user1
        n1 = Notification.objects.create(
            user=self.user1,
            title="Alert 1",
            message="Message 1",
            type="CARBON_ALERT"
        )
        # Create a notification for user2
        n2 = Notification.objects.create(
            user=self.user2,
            title="Alert 2",
            message="Message 2",
            type="CARBON_ALERT"
        )

        # 1. Unauthenticated access fails
        client_anon = APIClient()
        response = client_anon.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Get Notifications (User 1)
        response = self.client1.get("/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], n1.id)
        self.assertEqual(response.data[0]["title"], "Alert 1")

        # 3. Unread Count (User 1)
        response = self.client1.get("/api/notifications/count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["unread_count"], 1)

        # 4. Mark Read (User 1 trying to mark User 2's notification read -> should return 404/not allowed)
        response = self.client1.post(f"/api/notifications/read/{n2.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        n2.refresh_from_db()
        self.assertFalse(n2.is_read)

        # 5. Mark Read (User 1 marking own notification read)
        response = self.client1.post(f"/api/notifications/read/{n1.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        n1.refresh_from_db()
        self.assertTrue(n1.is_read)

        # 6. Unread Count is now 0 for User 1
        response = self.client1.get("/api/notifications/count/")
        self.assertEqual(response.data["unread_count"], 0)

