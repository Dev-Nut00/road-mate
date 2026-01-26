from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers # Need to add drf-nested-routers to requirements
from .views import SpaceViewSet, AvailabilityRuleViewSet, SpaceProductViewSet, SpaceImageViewSet

router = DefaultRouter()
router.register(r'spaces', SpaceViewSet, basename='space')

spaces_router = routers.NestedSimpleRouter(router, r'spaces', lookup='space')
spaces_router.register(r'availability-rules', AvailabilityRuleViewSet, basename='space-availability-rules')
spaces_router.register(r'products', SpaceProductViewSet, basename='space-products')
spaces_router.register(r'images', SpaceImageViewSet, basename='space-images')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(spaces_router.urls)),
]
