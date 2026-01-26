import pytest
import datetime
from django.utils import timezone
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.spaces.models import Space, SpaceProduct, AvailabilityRule
from apps.reservations.models import Reservation

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def setup_data(db):
    host = User.objects.create_user(username='host', password='pw', role='HOST')
    driver = User.objects.create_user(username='driver', password='pw', role='DRIVER')
    space = Space.objects.create(host=host, title='S', lat=0, lng=0, is_active=True)
    
    # Next Monday 09:00 - 18:00
    AvailabilityRule.objects.create(space=space, day_of_week=0, start_time='09:00', end_time='18:00')
    hourly = SpaceProduct.objects.create(space=space, type='HOURLY', price=1000, is_active=True)
    
    # Determine next Monday date
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)

    return {'host': host, 'driver': driver, 'space': space, 'hourly': hourly, 'date': next_monday}

@pytest.mark.django_db(transaction=True) # Use transaction=True to test database constraints
def test_overlap_confirmation_prevention(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    date = setup_data['date']
    
    # Overlapping 10:00 - 12:00
    start_1 = datetime.datetime.combine(date, datetime.time(10, 0))
    end_1 = datetime.datetime.combine(date, datetime.time(12, 0))
    
    # Overlapping 11:00 - 13:00
    start_2 = datetime.datetime.combine(date, datetime.time(11, 0))
    end_2 = datetime.datetime.combine(date, datetime.time(13, 0))
    
    # Create Reservation A (PENDING)
    res_a = Reservation.objects.create(
        space=setup_data['space'], driver=setup_data['driver'], product=setup_data['hourly'],
        start_at=timezone.make_aware(start_1), end_at=timezone.make_aware(end_1),
        price_total=1000, status='PENDING'
    )
    
    # Create Reservation B (PENDING) - Overlaps A
    res_b = Reservation.objects.create(
        space=setup_data['space'], driver=setup_data['driver'], product=setup_data['hourly'],
        start_at=timezone.make_aware(start_2), end_at=timezone.make_aware(end_2),
        price_total=1000, status='PENDING'
    )
    
    # 1. Confirm A -> Success
    response = api_client.post(f'/reservations/{res_a.id}/confirm/')
    assert response.status_code == 200
    res_a.refresh_from_db()
    assert res_a.status == 'CONFIRMED'
    
    # 2. Confirm B -> Fail (409 Conflict)
    response = api_client.post(f'/reservations/{res_b.id}/confirm/')
    assert response.status_code == 409
    res_b.refresh_from_db()
    assert res_b.status == 'PENDING'

@pytest.mark.django_db(transaction=True)
def test_non_overlapping_confirmation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    date = setup_data['date']
    
    # 10:00 - 12:00
    start_1 = datetime.datetime.combine(date, datetime.time(10, 0))
    end_1 = datetime.datetime.combine(date, datetime.time(12, 0))
    
    # 12:00 - 14:00 (Adjacent, not overlapping if [))
    start_2 = datetime.datetime.combine(date, datetime.time(12, 0))
    end_2 = datetime.datetime.combine(date, datetime.time(14, 0))
    
    res_a = Reservation.objects.create(
        space=setup_data['space'], driver=setup_data['driver'], product=setup_data['hourly'],
        start_at=timezone.make_aware(start_1), end_at=timezone.make_aware(end_1),
        price_total=1000, status='PENDING'
    )
    
    res_b = Reservation.objects.create(
        space=setup_data['space'], driver=setup_data['driver'], product=setup_data['hourly'],
        start_at=timezone.make_aware(start_2), end_at=timezone.make_aware(end_2),
        price_total=1000, status='PENDING'
    )
    
    # Confirm A
    response = api_client.post(f'/reservations/{res_a.id}/confirm/')
    assert response.status_code == 200
    
    # Confirm B -> Success
    response = api_client.post(f'/reservations/{res_b.id}/confirm/')
    assert response.status_code == 200
