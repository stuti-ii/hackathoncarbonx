from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


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


class UserProfile(models.Model):
    """Stores user trading data including cash balance, credits, and offsets"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    cash_balance = models.DecimalField(max_digits=10, decimal_places=2, default=2500.00)
    credits_owned = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_retired_offset = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.email} - Balance: ${self.cash_balance}"


class Transaction(models.Model):
    """Logs all buy, offset, and deposit transactions"""
    TRANSACTION_TYPES = [
        ('BUY', 'Buy Credits'),
        ('OFFSET', 'Offset Carbon'),
        ('DEPOSIT', 'Cash Deposit'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    project_id = models.CharField(max_length=100, null=True, blank=True)
    project_name = models.CharField(max_length=255)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    total_value = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.transaction_type} - {self.project_name}"


# carbon/carbon_engine.py

def calculate_carbon(platform, duration):
    rates = {
        "youtube": 0.02,
        "netflix": 0.05,
        "instagram": 0.01,
        "facebook": 0.015,
    }

    return rates.get(platform.lower(), 0.02) * duration