from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    is_host = models.BooleanField(default=False, help_text="Designates whether the user is a host.")
    is_driver = models.BooleanField(default=True, help_text="Designates whether the user is a driver.")
    
    # Profile Fields
    name = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=255, blank=True)
    car_model = models.CharField(max_length=100, blank=True)
    car_number = models.CharField(max_length=20, blank=True)
    
    def __str__(self):
        roles = []
        if self.is_host: roles.append('Host')
        if self.is_driver: roles.append('Driver')
        return f"{self.username} ({', '.join(roles)})"

class Vehicle(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='vehicles')
    car_number = models.CharField(max_length=20)
    car_model = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.car_number} ({self.car_model})"

