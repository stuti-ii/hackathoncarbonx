from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from django.db.models import Sum
from django.db.models.functions import TruncDate

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
