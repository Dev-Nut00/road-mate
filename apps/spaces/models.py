from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class Space(models.Model):
    host = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='spaces')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255)
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    lng = models.DecimalField(max_digits=9, decimal_places=6)
    # image field removed, using SpaceImage model instead
    is_active = models.BooleanField(default=True)
    is_auto_approval = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def clean(self):
        if not (-90 <= self.lat <= 90):
            raise ValidationError({'lat': 'Latitude must be between -90 and 90.'})
        if not (-180 <= self.lng <= 180):
            raise ValidationError({'lng': 'Longitude must be between -180 and 180.'})

class SpaceImage(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='spaces/')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.space.title}"

class AvailabilityRule(models.Model):
    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='availability_rules')
    day_of_week = models.IntegerField(choices=[
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'),
        (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')
    ])
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ['day_of_week', 'start_time']

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("End time must be after start time.")

class SpaceProduct(models.Model):
    class ProductType(models.TextChoices):
        HOURLY = 'HOURLY', 'Hourly'
        DAY_PASS = 'DAY_PASS', 'Day Pass'

    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='products')
    type = models.CharField(max_length=20, choices=ProductType.choices)
    name = models.CharField(max_length=100, blank=True)
    price = models.IntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('space', 'type') # Basic constraint, application logic can enforce "active only" uniqueness

    def clean(self):
        if self.price < 0:
            raise ValidationError({'price': 'Price must be positive.'})
