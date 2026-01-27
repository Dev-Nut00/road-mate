from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from rest_framework.routers import DefaultRouter
from .views import RegisterView, HostOnlyView, DriverOnlyView, ProfileView, VehicleViewSet
from . import views

router = DefaultRouter()
router.register(r'me/vehicles', VehicleViewSet, basename='vehicle')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('me/host-only/', views.HostOnlyView.as_view()),
    path('me/driver-only/', views.DriverOnlyView.as_view()),
] + router.urls
