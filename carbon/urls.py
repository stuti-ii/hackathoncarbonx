from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register),
    path('auth/register/', views.register),
    path('activities/', views.activities),
    path("dashboard/summary/", views.dashboard_summary),
    path("dashboard/breakdown/", views.carbon_breakdown),
    path("dashboard/trends/", views.carbon_trends),
    path("ecoscore/", views.eco_score),
    path("gamification/profile/", views.gamification_profile),
    path("gamification/badges/", views.gamification_badges),
    path("gamification/challenges/", views.gamification_challenges),
    path("recommendations/", views.recommendations),
    path("download-report/", views.generate_pdf),
    path("check-activities/", views.check_activities),
    
    # Trading endpoints
    path("trading/trade/", views.execute_trade),
    path("trading/deposit/", views.deposit_cash),
    path("trading/profile/", views.trading_profile),
    path("trading/transactions/", views.trading_transactions),

    # Notification endpoints
    path("notifications/", views.get_notifications),
    path("notifications/read/<int:id>/", views.mark_notification_read),
    path("notifications/count/", views.unread_count),
]

