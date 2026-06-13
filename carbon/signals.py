from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from .models import Activity, Notification

@receiver(post_save, sender=Activity)
def handle_activity_notifications(sender, instance, created, **kwargs):
    if created:
        user = instance.user

        # Rule 1: Carbon Alert (if carbon > 2 kg)
        if instance.carbon > 2:
            Notification.objects.create(
                user=user,
                title="Carbon Alert",
                message="Your recent activity generated more than 2 kg CO₂ emissions.",
                type="CARBON_ALERT"
            )

        # Rule 2: Achievement Unlocked (if total activities reach 10, 25, 50, 100)
        total_activities = Activity.objects.filter(user=user).count()
        if total_activities in [10, 25, 50, 100]:
            msg = f"You have completed {total_activities} tracked activities."
            # Check to avoid duplicate achievement notifications for the same count
            if not Notification.objects.filter(user=user, type="ACHIEVEMENT", message=msg).exists():
                Notification.objects.create(
                    user=user,
                    title="Achievement Unlocked",
                    message=msg,
                    type="ACHIEVEMENT"
                )

        # Rule 3: Offset Suggestion (if total weekly emissions exceed 10 kg)
        start_of_week = timezone.now() - timedelta(days=7)
        total_weekly_emissions = Activity.objects.filter(
            user=user,
            created_at__gte=start_of_week
        ).aggregate(total=Sum('carbon'))['total'] or 0.0

        if total_weekly_emissions > 10:
            # Check if we already created an OFFSET_SUGGESTION notification in the current 7-day window to prevent duplicate notifications
            if not Notification.objects.filter(user=user, type="OFFSET_SUGGESTION", created_at__gte=start_of_week).exists():
                Notification.objects.create(
                    user=user,
                    title="Offset Recommendation",
                    message="You generated more than 10 kg CO₂ this week. Consider purchasing carbon credits.",
                    type="OFFSET_SUGGESTION"
                )
