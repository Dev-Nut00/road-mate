from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_host', 'is_driver', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('is_host', 'is_driver')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('is_host', 'is_driver')}),
    )
