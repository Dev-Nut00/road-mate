from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.permissions import IsHost
from .models import Space, AvailabilityRule, SpaceProduct, SpaceImage
from .serializers import SpaceSerializer, AvailabilityRuleSerializer, SpaceProductSerializer, SpaceImageSerializer

class IsSpaceOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.host == request.user

class SpaceViewSet(viewsets.ModelViewSet):
    queryset = Space.objects.all()
    serializer_class = SpaceSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'deactivate']:
            return [permissions.IsAuthenticated(), IsHost(), IsSpaceOwner()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        mine = self.request.query_params.get('mine')
        if mine == 'true' and self.request.user.is_authenticated:
             return Space.objects.filter(host=self.request.user).order_by('-created_at')
        return Space.objects.filter(is_active=True).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    def perform_update(self, serializer):
        """Cancel active reservations if space is being deactivated."""
        instance = serializer.instance
        new_is_active = serializer.validated_data.get('is_active', instance.is_active)
        
        # If transitioning from active to inactive, cancel active reservations
        if instance.is_active and not new_is_active:
            self._cancel_active_reservations(instance)
        
        serializer.save()

    def perform_destroy(self, instance):
        """Cancel active reservations before deleting the space."""
        self._cancel_active_reservations(instance)
        instance.delete()

    def _cancel_active_reservations(self, space):
        """Helper to cancel all pending/confirmed reservations for this space."""
        from apps.reservations.models import Reservation
        active_reservations = Reservation.objects.filter(
            space=space,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED]
        )
        active_reservations.update(status=Reservation.Status.CANCELED)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        space = self.get_object()
        self._cancel_active_reservations(space)
        space.is_active = False
        space.save()
        return Response({'status': 'space deactivated'})

class BaseNestedViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsHost()] # Ownership check in queryset/validation needed ideally
        return [permissions.AllowAny()]

    def get_space(self):
        return Space.objects.get(pk=self.kwargs['space_pk'])

    def perform_create(self, serializer):
        space = self.get_space()
        if space.host != self.request.user:
            raise permissions.PermissionDenied("You do not own this space.")
        serializer.save(space=space)

class AvailabilityRuleViewSet(BaseNestedViewSet):
    serializer_class = AvailabilityRuleSerializer
    
    def get_queryset(self):
        return AvailabilityRule.objects.filter(space_id=self.kwargs['space_pk'])

class SpaceProductViewSet(BaseNestedViewSet):
    serializer_class = SpaceProductSerializer
    
    def get_queryset(self):
        return SpaceProduct.objects.filter(space_id=self.kwargs['space_pk'], is_active=True)

class SpaceImageViewSet(BaseNestedViewSet):
    serializer_class = SpaceImageSerializer
    
    def get_queryset(self):
        return SpaceImage.objects.filter(space_id=self.kwargs['space_pk'])
        
    def perform_destroy(self, instance):
        # Verify ownership before deleting
        if instance.space.host != self.request.user:
            raise permissions.PermissionDenied("You do not own this space.")
        instance.delete()
