from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return self.email


class Activity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    platform = models.CharField(max_length=100)
    duration = models.IntegerField()
    carbon = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    energy = models.FloatField(default=0)
# carbon/carbon_engine.py

def calculate_carbon(platform, duration):
    rates = {
        "youtube": 0.02,
        "netflix": 0.05,
        "instagram": 0.01,
        "facebook": 0.015,
    }

    return rates.get(platform.lower(), 0.02) * duration    