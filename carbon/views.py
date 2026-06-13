from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import timedelta

from django.db.models import Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from rest_framework.permissions import AllowAny, IsAuthenticated

from carbon.models import Activity, User
from .serializers import ActivitySerializer, RegisterSerializer


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
            "description": "Watch streaming at 1080p instead of 4K for a week.",
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
