from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta, datetime
from .models import Reservation
from apps.spaces.models import SpaceProduct

class ReservationSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=SpaceProduct.objects.filter(is_active=True), source='product', write_only=True
    )
    date = serializers.DateField(required=False, write_only=True)  # For DAY_PASS
    
    # Inputs
    vehicle_id = serializers.IntegerField(required=False, write_only=True)
    carNumber = serializers.CharField(source='car_number', required=False) # Frontend sends carNumber

    class Meta:
        model = Reservation
        fields = [
            'id', 'space', 'product_id', 'product', 'start_at', 'end_at', 
            'date', 'status', 'price_total', 'created_at',
            'vehicle_id', 'carNumber', 'driver', 'vehicle'
        ]
        read_only_fields = ['id', 'space', 'product', 'status', 'price_total', 'created_at', 'driver', 'vehicle']
        extra_kwargs = {
            'start_at': {'required': False},
            'end_at': {'required': False},
        }

    def validate(self, data):
        product = data.get('product')
        start_at = data.get('start_at')
        end_at = data.get('end_at')
        date_input = data.get('date')

        now = timezone.now()

        # 1. Product Type Specific Validation
        if product.type == SpaceProduct.ProductType.DAY_PASS:
            if not date_input:
                raise serializers.ValidationError("일일권은 날짜가 필수입니다.")
            
            # Prevent past date
            # Check based on server timezone date
            today = timezone.localdate(now)
            if date_input < today:
                raise serializers.ValidationError("과거 날짜는 예약할 수 없습니다.")

            # Convert date to start/end times (00:00 - 00:00 next day)
            # Assuming KST or server local time, simplistic approach using datetime.combine
            # For robustness, we should use Django's timezone awareness.
            dt_start = datetime.combine(date_input, datetime.min.time())
            dt_end = dt_start + timedelta(days=1)
            
            # Make aware
            if timezone.is_naive(dt_start):
                 start_at = timezone.make_aware(dt_start)
                 end_at = timezone.make_aware(dt_end)
            else:
                 start_at = dt_start
                 end_at = dt_end
            
            # Assign back to data to be saved
            data['start_at'] = start_at
            data['end_at'] = end_at

            # Price Calculation
            data['price_total'] = product.price

        elif product.type == SpaceProduct.ProductType.HOURLY:
            if not start_at or not end_at:
                raise serializers.ValidationError("시간제 예약은 시작/종료 시간이 필수입니다.")
            
            if start_at >= end_at:
                raise serializers.ValidationError("종료 시간은 시작 시간보다 뒤이어야 합니다.")
            
            # Prevent past time
            # Allow booking if start_at is in the future relative to request time
            if start_at < now:
                raise serializers.ValidationError("과거 시간은 예약할 수 없습니다.")

            # 30-min increment validation
            # Check minute is 0 or 30, second 0, microsecond 0
            for dt in [start_at, end_at]:
                if dt.minute % 30 != 0 or dt.second != 0 or dt.microsecond != 0:
                     raise serializers.ValidationError("예약은 30분 단위로만 가능합니다.")

            # Price Calculation
            duration = end_at - start_at
            hours = duration.total_seconds() / 3600  # Convert to hours
            data['price_total'] = int(hours * product.price)

        # 2. Availability Check
        # Check if [start_at, end_at] is contained within ANY availability rule of the space
        # Rule: day_of_week matches start_at's day, and times cover the range.
        
        # KEY FIX: Convert UTC start_at/end_at to Space's Local Time (Project Timezone) before comparing with naive Rule times.
        current_tz = timezone.get_current_timezone()
        start_local = start_at.astimezone(current_tz)
        end_local = end_at.astimezone(current_tz)

        space = product.space
        weekday = start_local.weekday() # 0=Mon (based on local time)
        
        # Convert datetime to time for comparison
        req_start_time = start_local.time()
        req_end_time = end_local.time()
        
        rules = space.availability_rules.filter(day_of_week=weekday)
        is_covered = False
        for rule in rules:
            if rule.start_time <= req_start_time and rule.end_time >= req_end_time:
                 is_covered = True
                 break
                 
        if not is_covered:
             raise serializers.ValidationError("Reservation time is not within space availability.")

        # 3. Overlap Check (Prevent Double Booking)
        # Check against existing reservations for this space
        overlapping_qs = Reservation.objects.filter(
            space=space,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            start_at__lt=end_at,
            end_at__gt=start_at
        )
        
        # Exclude current instance if updating
        if self.instance:
            overlapping_qs = overlapping_qs.exclude(pk=self.instance.pk)
            
        if overlapping_qs.exists():
             raise serializers.ValidationError("이미 예약된 시간대입니다. 다른 시간을 선택해주세요.")

        # Set space explicitly
        data['space'] = space
        
        # Cleanup write-only fields not in model
        data.pop('date', None)
        
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Expand space field
        from apps.spaces.serializers import SpaceSerializer
        representation['space'] = SpaceSerializer(instance.space).data
        
        # Expand driver (minimal info)
        representation['driver'] = {
            'id': instance.driver.id,
            'username': instance.driver.username,
            'name': instance.driver.name
        }
        
        # Expand vehicle
        if instance.vehicle:
            representation['vehicle'] = {
                'id': instance.vehicle.id,
                'car_number': instance.vehicle.car_number,
                'car_model': instance.vehicle.car_model
            }
        
        return representation
        start_at = data.get('start_at')
        end_at = data.get('end_at')
        date_input = data.get('date')

        now = timezone.now()

        # 1. Product Type Specific Validation
        if product.type == SpaceProduct.ProductType.DAY_PASS:
            if not date_input:
                raise serializers.ValidationError("일일권은 날짜가 필수입니다.")
            
            # Prevent past date
            # Check based on server timezone date
            today = timezone.localdate(now)
            if date_input < today:
                raise serializers.ValidationError("과거 날짜는 예약할 수 없습니다.")

            # Convert date to start/end times (00:00 - 00:00 next day)
            # Assuming KST or server local time, simplistic approach using datetime.combine
            # For robustness, we should use Django's timezone awareness.
            dt_start = datetime.combine(date_input, datetime.min.time())
            dt_end = dt_start + timedelta(days=1)
            
            # Make aware
            if timezone.is_naive(dt_start):
                 start_at = timezone.make_aware(dt_start)
                 end_at = timezone.make_aware(dt_end)
            else:
                 start_at = dt_start
                 end_at = dt_end
            
            # Assign back to data to be saved
            data['start_at'] = start_at
            data['end_at'] = end_at

            # Price Calculation
            data['price_total'] = product.price

        elif product.type == SpaceProduct.ProductType.HOURLY:
            if not start_at or not end_at:
                raise serializers.ValidationError("시간제 예약은 시작/종료 시간이 필수입니다.")
            
            if start_at >= end_at:
                raise serializers.ValidationError("종료 시간은 시작 시간보다 뒤이어야 합니다.")
            
            # Prevent past time
            # Allow booking if start_at is in the future relative to request time
            if start_at < now:
                raise serializers.ValidationError("과거 시간은 예약할 수 없습니다.")

            # 30-min increment validation
            # Check minute is 0 or 30, second 0, microsecond 0
            for dt in [start_at, end_at]:
                if dt.minute % 30 != 0 or dt.second != 0 or dt.microsecond != 0:
                     raise serializers.ValidationError("예약은 30분 단위로만 가능합니다.")

            # Price Calculation
            duration = end_at - start_at
            hours = duration.total_seconds() / 3600  # Convert to hours
            data['price_total'] = int(hours * product.price)

        # 2. Availability Check
        # Check if [start_at, end_at] is contained within ANY availability rule of the space
        # Rule: day_of_week matches start_at's day, and times cover the range.
        # This is a simplification: what if reservation spans midnight or multiple days (HOURLY)?
        # For simplicity, we assume HOURLY reservation is within a single day or consecutive logic 
        # aligns with a single rule if we don't support multi-day rule matching yet.
        # But let's check `AvailabilityRule` logic.
        
        space = product.space
        weekday = start_at.weekday() # 0=Mon
        
        # Simple containment check: Find a rule for this weekday that covers the time range
        # Note: AvailabilityRule uses time objects. data['start_at'] is datetime.
        # This check might fail for multi-day reservations using simple logic. 
        # User constraint: "Reservation range is contained in availability_rules".
        
        # Convert datetime to time for comparison
        req_start_time = start_at.time()
        req_end_time = end_at.time()
        
        # Special handling for DAY_PASS or midnight wrapping:
        # If end_at time is 00:00 and it's next day, rule might end at 23:59? 
        # AvailabilityRule models time... 
        # Let's assume Rule 09:00-18:00.
        # If DAY_PASS, it asks for 00:00-24:00. This will FAIL if rule is only 09-18.
        # WAIT. User requirement: "DAY_PASS is date -> 00:00~다음날00:00".
        # But "Warning: 예약 구간은 availability_rules 안에 포함되어야 함".
        # This implies DAY_PASS is only valid if rule covers 00:00-24:00 (24 hours)?
        # OR DAY_PASS grants access for the whole day irrespective of availability?
        # Usually DAY_PASS implies "All day access". 
        # If Host set availability 9-5, can I buy Day Pass?
        # User says: "예약 구간은 availability_rules 안에 포함되어야 함"
        # STRICT INTERPRETATION: Yes, if rule is 9-5, you CANNOT buy Day Pass (0-24).
        # This makes DAY_PASS usable only for 24h spaces.
        # I will strictly follow "Included in availability_rules".
        
        rules = space.availability_rules.filter(day_of_week=weekday)
        is_covered = False
        for rule in rules:
            # Rule: start <= req_start AND rule_end >= req_end
            # Special case: Rule end 00:00 usually means 'until end of day' or 'next day'?
            # Our time field can't store 24:00. Max 23:59:59.
            # If logic requires 00:00 next day, model needs adjustment or convention.
            # Usually end_time < start_time implies overnight?
            # Let's assume simple intraday rules for now as per previous step.
            
            # Check logic:
            if rule.start_time <= req_start_time:
                 # Check end time.
                 # If req_end_time is 00:00 (midnight of next day), effectively larger than any time?
                 # If rule.end_time is 00:00 (meaning midnight? No time object 00:00 is Start of day).
                 # Ideally AvailabilityRule should handle overnight. 
                 # Let's stick to simple comparison.
                 if rule.end_time >= req_end_time:
                      is_covered = True
                      break
                 # Special case check: if req_end_time is 00:00 (next day start), it acts as max time?
                 # But python time(0,0) is min time.
                 # We need to handle `end_at` explicitly.
                 
        if not is_covered:
             # Try to handle the "next day 00:00" case for DAY_PASS if Rule covers until "end of day".
             # If rule.end_time is 23:59:59?
             pass 
             # STRICT CHECK: If not covered, Raise Error.
             # I will assume standard comparison for now.
             raise serializers.ValidationError("Reservation time is not within space availability.")

        # 3. Overlap Check (Prevent Double Booking)
        # Check against existing reservations for this space
        # Status: PENDING or CONFIRMED
        # Time overlapping: (StartA < EndB) and (EndA > StartB)
        overlapping_qs = Reservation.objects.filter(
            space=space,
            status__in=[Reservation.Status.PENDING, Reservation.Status.CONFIRMED],
            start_at__lt=end_at,
            end_at__gt=start_at
        )
        
        # Exclude current instance if updating
        if self.instance:
            overlapping_qs = overlapping_qs.exclude(pk=self.instance.pk)
            
        if overlapping_qs.exists():
             raise serializers.ValidationError("이미 예약된 시간대입니다. 다른 시간을 선택해주세요.")

        # Set space explicitly
        data['space'] = space
        
        # Cleanup write-only fields not in model
        data.pop('date', None)
        
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Expand space field
        from apps.spaces.serializers import SpaceSerializer
        representation['space'] = SpaceSerializer(instance.space).data
        return representation
