from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from django.http import HttpResponse
from .models import Activity, UserProfile, Transaction, Notification

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework.permissions import AllowAny, IsAuthenticated

from carbon.models import Activity, User, UserProfile, Transaction, Notification
from .serializers import ActivitySerializer, RegisterSerializer, UserProfileSerializer, TransactionSerializer, NotificationSerializer
from decimal import Decimal


def authenticate_with_identifier(identifier, password):
    if not identifier or not password:
        return None

    user = authenticate(username=identifier, password=password)
    if user:
        return user

    matched_user = (
        User.objects
        .filter(username=identifier)
        .only(User.USERNAME_FIELD)
        .first()
    )
    if matched_user:
        return authenticate(
            username=getattr(matched_user, User.USERNAME_FIELD),
            password=password
        )

    return None


def jwt_response_for_user(user):
    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    })


BADGES = [
    {"id": "pital", "name": "Pital", "xp_required": 0},
    {"id": "chadi", "name": "Chadi", "xp_required": 100},
    {"id": "sun", "name": "Sun", "xp_required": 300},
    {"id": "hira", "name": "Hira", "xp_required": 600},
]


def gamification_points(user):
    return Activity.objects.filter(user=user).count() * 10


def gamification_level(points):
    return points // 100


def gamification_streak(user):
    activity_days = set(
        Activity.objects
        .filter(user=user)
        .annotate(day=TruncDate("created_at"))
        .values_list("day", flat=True)
    )

    streak = 0
    current_day = timezone.localdate()
    while current_day in activity_days:
        streak += 1
        current_day -= timedelta(days=1)

    return streak


def badge_earned_at(user, xp_required):
    if xp_required == 0:
        return user.date_joined.date().isoformat()

    activity_number = xp_required // 10
    activity = (
        Activity.objects
        .filter(user=user)
        .order_by("created_at")
        [activity_number - 1:activity_number]
        .first()
    )

    if not activity:
        return None

    return activity.created_at.date().isoformat()


def gamification_badge_data(user):
    points = gamification_points(user)

    return [
        {
            "id": badge["id"],
            "name": badge["name"],
            "unlocked": points >= badge["xp_required"],
            "earned_at": badge_earned_at(user, badge["xp_required"])
            if points >= badge["xp_required"] else None,
        }
        for badge in BADGES
    ]


# -------------------------
# REGISTER
# -------------------------
@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get("email")
    password = request.data.get("password")

    if not email or not password:
        return Response({"error": "Email and password required"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "User already exists"}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password
    )

    return Response({
        "message": "User created successfully",
        "user_id": user.id
    })


# -------------------------
# LOGIN
# -------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')

    user = authenticate_with_identifier(username, password)

    if user:
        return jwt_response_for_user(user)

    return Response(
        {"detail": "Invalid credentials"},
        status=status.HTTP_401_UNAUTHORIZED
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def token_obtain_pair(request):
    identifier = request.data.get('username') or request.data.get('email')
    password = request.data.get('password')

    user = authenticate_with_identifier(identifier, password)

    if user:  
        return jwt_response_for_user(user)

    return Response(
        {"detail": "Invalid credentials"},
        status=status.HTTP_401_UNAUTHORIZED
    )


# -------------------------
# ACTIVITIES
# -------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def activities(request):

    if request.method == 'POST':
        serializer = ActivitySerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    if request.method == 'GET':
        data = Activity.objects.filter(user=request.user).order_by('-created_at')
        serializer = ActivitySerializer(data, many=True)
        return Response(serializer.data)


# -------------------------
# DASHBOARD SUMMARY
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):

    activities = Activity.objects.filter(user=request.user)

    total_carbon = sum(a.carbon for a in activities)
    total_energy = sum(a.energy for a in activities)
    ai_usage = sum(a.duration for a in activities)

    eco_score = max(0, 100 - int(total_carbon))

    return Response({
        "totalCarbon": round(total_carbon, 2),
        "ecoScore": eco_score,
        "energyConsumed": round(total_energy, 2),
        "aiUsage": ai_usage
    })


# -------------------------
# BREAKDOWN
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def carbon_breakdown(request):

    breakdown = (
        Activity.objects
        .filter(user=request.user)
        .values("platform")
        .annotate(carbon=Sum("carbon"))
        .order_by("platform")
    )

    return Response([
        {
            "platform": item["platform"].lower(),
            "carbon": round(item["carbon"] or 0, 2),
        }
        for item in breakdown
    ])


# -------------------------
# TRENDS
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def carbon_trends(request):

    trends = (
        Activity.objects
        .filter(user=request.user)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(carbon=Sum("carbon"))
        .order_by("day")
    )

    return Response([
        {
            "day": item["day"].isoformat(),
            "carbon": round(item["carbon"] or 0, 2),
        }
        for item in trends
    ])


# -------------------------
# ECO SCORE
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def eco_score(request):

    total = Activity.objects.filter(user=request.user).aggregate(
        total=Sum("carbon")
    )["total"]

    if total is None:
        total = 0

    score = max(0, 100 - int(total))

    return Response({
        "score": score,
        "rating": (
            "Excellent" if score > 85 else
            "Good" if score > 70 else
            "Needs Improvement"
        ),
        "aiEfficiency": 85,
        "streamingEfficiency": 78
    })


# -------------------------
# GAMIFICATION
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamification_profile(request):
    points = gamification_points(request.user)
    level = gamification_level(points)
    badges = gamification_badge_data(request.user)

    return Response({
        "level": level,
        "points": points,
        "streak": gamification_streak(request.user),
        "next_level_xp": (level + 1) * 100,
        "badges_earned": [
            badge["id"]
            for badge in badges
            if badge["unlocked"]
        ],
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamification_badges(request):
    return Response(gamification_badge_data(request.user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def gamification_challenges(request):
    return Response([
        {
            "id": 1,
            "title": "Reduce AI Usage",
            "description": "Use AI tools for less than 30 minutes today.",
            "reward_xp": 100,
            "completed": False,
            "deadline": "Weekly"
        },
        {
            "id": 2,
            "title": "Stream Smarter",
            "description": "Used streaming platforms for less than 1 hour today.",
            "reward_xp": 75,
            "completed": False,
            "deadline": "Weekly"
        },
        {
            "id": 3,
            "title": "Social Media Detox",
            "description": "Keep social media under 20 minutes for 3 days.",
            "reward_xp": 50,
            "completed": True,
            "deadline": "Weekly"
        }
    ])

# -------------------------
# RECOMMENDATIONS
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def recommendations(request):

    return Response([
        {
            "title": "Reduce AI Usage",
            "description": "Reduce daily AI use by 15 minutes."
        },
        {
            "title": "Lower Streaming Quality",
            "description": "Watch videos in 720p instead of 4K."
        }
    ])
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_activities(request):
    activities = Activity.objects.filter(user=request.user).order_by("-created_at")

    return Response({
        "user": request.user.email,
        "count": activities.count(),
        "activities": [
            {
                "id": a.id,
                "platform": a.platform,
                "duration": a.duration,
                "carbon": a.carbon,
                "energy": a.energy,
                "created_at": a.created_at
            }
            for a in activities
        ]
    })

def generate_pdf(request):
    user = request.user
    activities = Activity.objects.filter(user=user)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'attachment; filename="carbonx_report.pdf"'

    pdf = SimpleDocTemplate(response)
    styles = getSampleStyleSheet()

    content = []

    content.append(Paragraph("CarbonX Activity Report", styles["Title"]))
    content.append(Spacer(1, 12))

    total_carbon = sum([a.carbon for a in activities])

    content.append(Paragraph(f"Total Carbon: {total_carbon}", styles["Heading2"]))
    content.append(Spacer(1, 12))

    for a in activities:
        text = f"Platform: {a.platform} | Duration: {a.duration} | Carbon: {a.carbon}"
        content.append(Paragraph(text, styles["BodyText"]))
        content.append(Spacer(1, 8))

    pdf.build(content)

    return response


# -------------------------
# TRADING ENDPOINTS
# -------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def execute_trade(request):
    """
    Execute a BUY or OFFSET trade.
    
    Body:
    {
        "project_id": "proj-1",
        "projectName": "Terai Forest Conservation",
        "type": "BUY",  # or "OFFSET"
        "quantity": 1.50,
        "totalValue": 27.75
    }
    """
    try:
        user = request.user
        project_id = request.data.get('project_id')
        project_name = request.data.get('projectName')
        trade_type = request.data.get('type', '').upper()
        quantity = Decimal(str(request.data.get('quantity', 0)))
        total_value = Decimal(str(request.data.get('totalValue', 0)))

        if not project_name or not trade_type:
            return Response(
                {"error": "Missing required fields: projectName, type"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if trade_type not in ['BUY', 'OFFSET']:
            return Response(
                {"error": "Invalid type. Must be 'BUY' or 'OFFSET'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)

        if trade_type == 'BUY':
            # Check if user has enough balance
            if profile.cash_balance < total_value:
                return Response(
                    {
                        "error": "Insufficient balance",
                        "available": float(profile.cash_balance),
                        "required": float(total_value)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Deduct cash and add credits
            profile.cash_balance -= total_value
            profile.credits_owned += quantity
            profile.save()

            # Log transaction
            Transaction.objects.create(
                user=user,
                project_id=project_id,
                project_name=project_name,
                transaction_type='BUY',
                quantity=quantity,
                total_value=total_value
            )

        elif trade_type == 'OFFSET':
            # Check if user has enough credits
            if profile.credits_owned < quantity:
                return Response(
                    {
                        "error": "Insufficient credits",
                        "available": float(profile.credits_owned),
                        "required": float(quantity)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Deduct credits and add to retired offset
            profile.credits_owned -= quantity
            profile.total_retired_offset += (quantity * 1000)
            profile.save()

            # Log transaction
            Transaction.objects.create(
                user=user,
                project_id=project_id,
                project_name=project_name,
                transaction_type='OFFSET',
                quantity=quantity,
                total_value=total_value
            )

        return Response({
            "success": True,
            "message": f"{trade_type} transaction completed",
            "cash_balance": float(profile.cash_balance),
            "credits_owned": float(profile.credits_owned),
            "total_retired_offset": float(profile.total_retired_offset)
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deposit_cash(request):
    """
    Deposit cash to user account (simulated payment).
    
    Body:
    {
        "amount": 500.00,
        "method": "esewa"  # or "khalti" / "card"
    }
    """
    try:
        user = request.user
        amount = Decimal(str(request.data.get('amount', 0)))
        method = request.data.get('method', 'card').lower()

        if amount <= 0:
            return Response(
                {"error": "Amount must be greater than 0"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Add amount to cash balance
        profile.cash_balance += amount
        profile.save()

        # Log transaction
        Transaction.objects.create(
            user=user,
            project_id=None,
            project_name=f"{method.upper()} Deposit",
            transaction_type='DEPOSIT',
            quantity=Decimal('0'),
            total_value=amount
        )

        return Response({
            "success": True,
            "message": f"Deposit of ${amount} completed via {method}",
            "cash_balance": float(profile.cash_balance),
            "credits_owned": float(profile.credits_owned),
            "total_retired_offset": float(profile.total_retired_offset)
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trading_profile(request):
    """Get current user's trading profile"""
    try:
        user = request.user
        profile, created = UserProfile.objects.get_or_create(user=user)

        return Response({
            "cash_balance": float(profile.cash_balance),
            "credits_owned": float(profile.credits_owned),
            "total_retired_offset": float(profile.total_retired_offset),
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trading_transactions(request):
    """Get all transactions for current user"""
    try:
        user = request.user
        transactions = Transaction.objects.filter(user=user)
        serializer = TransactionSerializer(transactions, many=True)

        return Response({
            "total_transactions": transactions.count(),
            "transactions": serializer.data
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# -------------------------
# NOTIFICATIONS
# -------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """Get all notifications for the current user, ordered newest first"""
    try:
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, id):
    """Mark a specific notification as read if it belongs to the current user"""
    try:
        notification = Notification.objects.get(id=id, user=request.user)
        notification.is_read = True
        notification.save()
        return Response({"success": True}, status=status.HTTP_200_OK)
    except Notification.DoesNotExist:
        return Response(
            {"error": "Notification not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unread_count(request):
    """Get count of unread notifications for the current user"""
    try:
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )