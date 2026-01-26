import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_authentication_flow():
    client = APIClient()

    # 1. Register
    register_data = {
        "username": "driver_user",
        "password": "testpassword123",
        "role": "DRIVER"
    }
    response = client.post('/auth/register', register_data)
    assert response.status_code == 201
    assert User.objects.count() == 1
    user = User.objects.first()
    assert user.role == 'DRIVER'

    # 2. Login
    login_data = {
        "username": "driver_user",
        "password": "testpassword123"
    }
    response = client.post('/auth/login', login_data)
    assert response.status_code == 200
    assert 'access' in response.data
    assert 'refresh' in response.data
    access_token = response.data['access']

    # 3. Access Protected Resource (Driver Only)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = client.get('/me/driver-only')
    assert response.status_code == 200
    
    # 4. Access Restricted Resource (Host Only)
    response = client.get('/me/host-only')
    assert response.status_code == 403

@pytest.mark.django_db
def test_host_access():
    client = APIClient()
    
    # Register Host
    client.post('/auth/register', {
        "username": "host_user",
        "password": "password",
        "role": "HOST"
    })
    
    # Login
    response = client.post('/auth/login', {
        "username": "host_user",
        "password": "password"
    })
    access_token = response.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

    # Access Host Only
    response = client.get('/me/host-only')
    assert response.status_code == 200

    # Access Driver Only (Should Fail)
    response = client.get('/me/driver-only')
    assert response.status_code == 403
