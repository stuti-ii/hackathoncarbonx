from django.urls import path
from .views import activities, carbon_breakdown, carbon_trends, dashboard_summary, eco_score, recommendations, register

urlpatterns = [
    path('register/', register),
    path('auth/register/', register),
    path('activities/', activities),
    path("dashboard/summary/", dashboard_summary),
    path("dashboard/breakdown/", carbon_breakdown),
    path("dashboard/trends/", carbon_trends),
    path("ecoscore/", eco_score),
    path("recommendations/", recommendations),
]
