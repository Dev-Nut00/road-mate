from django.db import models
from django.conf import settings
from django.contrib.postgres.fields import DateTimeRangeField
from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.indexes import GistIndex
from django.db.models import Q
from psycopg2.extras import DateTimeTZRange
from apps.spaces.models import Space, SpaceProduct

class Reservation(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CANCELED = 'CANCELED', 'Canceled'
        COMPLETED = 'COMPLETED', 'Completed'

    space = models.ForeignKey(Space, on_delete=models.CASCADE, related_name='reservations')
    driver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reservations')
    vehicle = models.ForeignKey('accounts.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')
    car_number = models.CharField(max_length=20, blank=True, default='')
    product = models.ForeignKey(SpaceProduct, on_delete=models.CASCADE, related_name='reservations')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    price_total = models.IntegerField()
    period = DateTimeRangeField(null=True, blank=True) # Populated on save
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            ExclusionConstraint(
                name='exclude_overlapping_reservations',
                expressions=[
                    ('space', '='),
                    ('period', '&&'),
                ],
                condition=Q(status='CONFIRMED'),
            ),
        ]

    def save(self, *args, **kwargs):
        # Determine bounds (inclusive, exclusive) defaults usually [)
        if self.start_at and self.end_at:
            self.period = DateTimeTZRange(self.start_at, self.end_at, '[)')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Res {self.id} - {self.status}"
