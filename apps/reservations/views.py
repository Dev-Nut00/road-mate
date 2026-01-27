from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from common.permissions import IsDriver
from .models import Reservation
from .serializers import ReservationSerializer

class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # If 'host=true' param is present, return reservations for spaces owned by the user
        if self.request.query_params.get('host') == 'true':
            # Assuming Space model has a 'host' field pointing to User
            return Reservation.objects.filter(space__host=self.request.user).order_by('-created_at')
        
        # Default: Users see their own reservations as drivers
        return Reservation.objects.filter(driver=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        if not self.request.user.is_driver:
            raise permissions.PermissionDenied("Only drivers can make reservations.")
        
        # Handle Vehicle Logic
        vehicle_id = serializer.validated_data.get('vehicle_id')
        car_number = serializer.validated_data.get('car_number', '')
        vehicle = None

        if vehicle_id:
            from apps.accounts.models import Vehicle
            try:
                vehicle = Vehicle.objects.get(id=vehicle_id, user=self.request.user)
                # If vehicle selected, use its number as snapshot
                car_number = vehicle.car_number
            except Vehicle.DoesNotExist:
                pass 
        
        # Auto-Approval Logic
        space = serializer.validated_data.get('product').space
        initial_status = Reservation.Status.CONFIRMED if space.is_auto_approval else Reservation.Status.PENDING
        
        serializer.save(driver=self.request.user, vehicle=vehicle, car_number=car_number, status=initial_status)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        from django.utils import timezone
        from datetime import timedelta
        
        reservation = self.get_object()
        
        # Driver can cancel PENDING or CONFIRMED
        # Host can cancel/reject any time? Let's check permissions.
        is_host = reservation.space.host == request.user
        is_driver = reservation.driver == request.user
        
        if not (is_host or is_driver):
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        if reservation.status not in [Reservation.Status.PENDING, Reservation.Status.CONFIRMED]:
            return Response({'error': 'Cannot cancel this reservation'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 2-hour rule assertion for Driver
        if is_driver:
            time_until_start = reservation.start_at - timezone.now()
            if time_until_start < timedelta(hours=2):
                return Response({'error': '예약 시작 2시간 전까지만 취소할 수 있습니다.'}, status=status.HTTP_400_BAD_REQUEST)

        reservation.status = Reservation.Status.CANCELED
        reservation.save()
        return Response({'status': 'canceled'})

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        from django.db import IntegrityError
        reservation = self.get_object()
        
        # Only Host can manually confirm if it's PENDING
        if reservation.space.host != request.user:
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        if reservation.status != Reservation.Status.PENDING:
            return Response({'error': 'Only pending reservations can be confirmed.'}, status=status.HTTP_400_BAD_REQUEST)
            
        reservation.status = Reservation.Status.CONFIRMED
        try:
            reservation.save()
        except IntegrityError:
            return Response({'detail': 'This time slot is no longer available.'}, status=status.HTTP_409_CONFLICT)
            
        return Response({'status': 'confirmed'})
        
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        reservation = self.get_object()
        
        # Only Host can reject
        if reservation.space.host != request.user:
             return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
             
        if reservation.status != Reservation.Status.PENDING:
             return Response({'error': 'Only pending reservations can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
             
        reservation.status = Reservation.Status.CANCELED # Or REJECTED if we had that state
        return Response({'status': 'rejected'})

    @action(detail=True, methods=['post'], url_path='payment/approve')
    def approve_payment(self, request, pk=None):
        reservation = self.get_object()
        
        # 1. Validation
        if reservation.status != Reservation.Status.PENDING:
            return Response({'error': 'Only PENDING reservations can be paid.'}, status=status.HTTP_400_BAD_REQUEST)
        
        tid = request.data.get('tid')
        order_id = request.data.get('orderId')
        amount = request.data.get('amount')
        
        if not all([tid, order_id, amount]):
            return Response({'error': 'Missing payment data'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Verify Amount
        if int(amount) != reservation.price_total:
             return Response({'error': 'Payment amount mismatch'}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Call NicePay API
        from .utils import NicePayClient
        from .models import Payment
        
        client = NicePayClient()
        result = client.approve(tid, amount, order_id)
        
        # 3. Handle Result
        if result.get('resultCode') == '0000':
            # Success
            Payment.objects.create(
                reservation=reservation,
                tid=tid,
                order_id=order_id,
                amount=amount,
                status=Payment.Status.PAID,
                paid_at=result.get('authDate') # Requires parsing? NicePay returns string. Simplified for now.
            )
            reservation.status = Reservation.Status.CONFIRMED
            reservation.save()
            return Response({'status': 'paid', 'data': result})
        else:
            # Failure
            return Response({'error': 'Payment failed', 'detail': result.get('resultMsg')}, status=status.HTTP_400_BAD_REQUEST)
