from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from django.db.models import Sum
from django.db.models.functions import TruncDate

from rest_framework.permissions import IsAuthenticated

from carbon.models import Activity
from .serializers import ActivitySerializer, RegisterSerializer


# -------------------------
# REGISTER
# -------------------------
@api_view(['POST'])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        return Response({
            "message": "User created successfully",
            "username": user.username
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# -------------------------
# LOGIN
# -------------------------
@api_view(['POST'])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)

    if user:
        refresh = RefreshToken.for_user(user)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

    return Response(
        {"error": "Invalid credentials"},
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
        "totalCarbon": total_carbon,
        "ecoScore": eco_score,
        "energyConsumed": total_energy,
        "aiUsage": ai_usage
    })


# -------------------------
# BREAKDOWN (FIXED)
# -------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def carbon_breakdown(request):

    activities = Activity.objects.filter(user=request.user)

    breakdown = {}

    for a in activities:
        platform = a.platform.lower()

        if platform in ["chatgpt", "gemini", "claude"]:
            key = "AI Usage"
        elif platform in ["youtube", "netflix", "spotify"]:
            key = "Streaming"
        elif platform in ["instagram", "facebook", "tiktok"]:
            key = "Social Media"
        elif platform in ["google", "chrome", "browser"]:
            key = "Browsing"
        else:
            key = "Other"

        breakdown[key] = breakdown.get(key, 0) + a.carbon

    return Response(breakdown)


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

    return Response(trends)


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