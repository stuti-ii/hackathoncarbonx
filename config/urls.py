from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from carbon.views import login, token_obtain_pair

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT
    path('api/login/', login),
    path('api/token/', token_obtain_pair),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    # APP ROUTES
    path('api/', include('carbon.urls')),
]
