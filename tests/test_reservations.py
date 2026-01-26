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
    
    # 09:00 - 18:00 on Monday(0)
    AvailabilityRule.objects.create(space=space, day_of_week=0, start_time='09:00', end_time='18:00')
    
    hourly_prod = SpaceProduct.objects.create(space=space, type='HOURLY', price=1000, is_active=True)
    day_pass_prod = SpaceProduct.objects.create(space=space, type='DAY_PASS', price=10000, is_active=True)
    
    return {'host': host, 'driver': driver, 'space': space, 'hourly': hourly_prod, 'day_pass': day_pass_prod}

@pytest.mark.django_db
def test_create_hourly_reservation_success(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    # Next Monday 10:00 - 12:00
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)
    
    start_at = datetime.datetime.combine(next_monday, datetime.time(10, 0))
    end_at = datetime.datetime.combine(next_monday, datetime.time(12, 0))
    
    response = api_client.post('/reservations/', {
        'product_id': setup_data['hourly'].id,
        'start_at': start_at.isoformat(),
        'end_at': end_at.isoformat()
    })
    
    assert response.status_code == 201
    assert response.data['price_total'] == 4000 # 2 hours * 2 slots/hr * 1000 == 4000

@pytest.mark.django_db
def test_create_hourly_reservation_fail_time_increment(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    # Next Monday 10:10 - 12:00
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)
    
    start_at = datetime.datetime.combine(next_monday, datetime.time(10, 10))
    end_at = datetime.datetime.combine(next_monday, datetime.time(12, 0))
    
    response = api_client.post('/reservations/', {
        'product_id': setup_data['hourly'].id,
        'start_at': start_at.isoformat(),
        'end_at': end_at.isoformat()
    })
    
    assert response.status_code == 400
    assert 'increments' in str(response.data)

@pytest.mark.django_db
def test_create_hourly_reservation_fail_availability(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    # Next Monday 19:00 - 20:00 (Outside 09-18)
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)
    
    start_at = datetime.datetime.combine(next_monday, datetime.time(19, 0))
    end_at = datetime.datetime.combine(next_monday, datetime.time(20, 0))
    
    response = api_client.post('/reservations/', {
        'product_id': setup_data['hourly'].id,
        'start_at': start_at.isoformat(),
        'end_at': end_at.isoformat()
    })
    
    assert response.status_code == 400
    assert 'availability' in str(response.data)

@pytest.mark.django_db
def test_create_day_pass_reservation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    # Next Monday
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)
    
    # Prerequisite: AvailabilityRule must cover 00:00-24:00 (or close) for DAY_PASS to work under strict rule
    # Our setup_data has 09:00-18:00. This test SHOULD FAIL if strict logic works.
    # Let's verify failure first.
    response = api_client.post('/reservations/', {
        'product_id': setup_data['day_pass'].id,
        'date': next_monday.isoformat()
    })
    assert response.status_code == 400 # Expect fail because 09-18 doesn't cover 00-24
    
    # Now add 24h rule
    AvailabilityRule.objects.create(space=setup_data['space'], day_of_week=0, start_time='00:00', end_time='23:59')
    
    response = api_client.post('/reservations/', {
        'product_id': setup_data['day_pass'].id,
        'date': next_monday.isoformat()
    })
    if response.status_code != 201:
        print(f"DEBUG: Response data: {response.data}")
    assert response.status_code == 201
    assert response.data['price_total'] == 10000

@pytest.mark.django_db
def test_cancel_reservation(api_client, setup_data):
    api_client.force_authenticate(user=setup_data['driver'])
    
    # Create valid reservation first
    today = timezone.localtime().date()
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0: days_ahead += 7
    next_monday = today + datetime.timedelta(days=days_ahead)
    start_at = datetime.datetime.combine(next_monday, datetime.time(10, 0))
    end_at = datetime.datetime.combine(next_monday, datetime.time(12, 0))
    
    res = Reservation.objects.create(
        space=setup_data['space'], driver=setup_data['driver'], product=setup_data['hourly'],
        start_at=timezone.make_aware(start_at), end_at=timezone.make_aware(end_at),
        price_total=1000, status='PENDING'
    )
    
    response = api_client.post(f'/reservations/{res.id}/cancel/')
    assert response.status_code == 200
    res.refresh_from_db()
    assert res.status == 'CANCELED'
