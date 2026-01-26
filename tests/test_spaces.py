import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.spaces.models import Space, SpaceProduct

User = get_user_model()

@pytest.mark.django_db
def test_space_creation_permission():
    client = APIClient()
    
    # 1. Driver tries to create space (Should fail)
    driver = User.objects.create_user(username='driver', password='pw', role='DRIVER')
    client.force_authenticate(user=driver)
    response = client.post('/spaces/', {
        'title': 'Driver Space', 'address': 'Addr', 'lat': 37.0, 'lng': 127.0
    })
    assert response.status_code == 403

    # 2. Host creates space (Should success)
    host = User.objects.create_user(username='host', password='pw', role='HOST')
    client.force_authenticate(user=host)
    response = client.post('/spaces/', {
        'title': 'Host Space', 'address': 'Addr', 'lat': 37.0, 'lng': 127.0
    })
    assert response.status_code == 201
    assert Space.objects.count() == 1
    assert Space.objects.get().host == host

@pytest.mark.django_db
def test_space_visibility():
    client = APIClient()
    host = User.objects.create_user(username='host', password='pw', role='HOST')
    
    # Create Active and Inactive spaces
    Space.objects.create(host=host, title='Active', address='A', lat=0, lng=0, is_active=True)
    Space.objects.create(host=host, title='Inactive', address='B', lat=0, lng=0, is_active=False)

    response = client.get('/spaces/')
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]['title'] == 'Active'

@pytest.mark.django_db
def test_product_management():
    client = APIClient()
    host = User.objects.create_user(username='host', password='pw', role='HOST')
    client.force_authenticate(user=host)
    
    # Create Space
    space_resp = client.post('/spaces/', {'title': 'S', 'address': 'A', 'lat': 0, 'lng': 0, 'is_active': True})
    space_id = space_resp.data['id']

    # Add Product
    prod_resp = client.post(f'/spaces/{space_id}/products/', {
        'type': 'HOURLY', 'price': 1000, 'is_active': True
    })
    assert prod_resp.status_code == 201
    
    # Verify Product in Space Detail
    space_detail = client.get(f'/spaces/{space_id}/')
    assert space_detail.status_code == 200
    assert len(space_detail.data['products']) == 1
    assert space_detail.data['products'][0]['price'] == 1000

@pytest.mark.django_db
def test_availability_rule_creation():
    client = APIClient()
    host = User.objects.create_user(username='host', password='pw', role='HOST')
    client.force_authenticate(user=host)
    
    space = Space.objects.create(host=host, title='S', address='A', lat=0, lng=0)
    
    # Invalid Time (Start > End)
    response = client.post(f'/spaces/{space.id}/availability-rules/', {
        'day_of_week': 0, 'start_time': '14:00', 'end_time': '12:00'
    })
    assert response.status_code == 400

    # Valid Time
    response = client.post(f'/spaces/{space.id}/availability-rules/', {
        'day_of_week': 0, 'start_time': '10:00', 'end_time': '12:00'
    })
    assert response.status_code == 201
