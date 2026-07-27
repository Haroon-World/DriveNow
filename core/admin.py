from django.contrib import admin
from .models import Car, Booking, ContactMessage


# ─────────────────────────────────────────────
#  CAR ADMIN
# ─────────────────────────────────────────────
@admin.register(Car)
class CarAdmin(admin.ModelAdmin):
    list_display  = ('brand', 'name', 'car_type', 'price_per_day', 'seats',
                     'transmission', 'fuel_type', 'is_available', 'created_at')
    list_filter   = ('car_type', 'is_available', 'transmission', 'fuel_type')
    search_fields = ('name', 'brand', 'description')
    list_editable = ('is_available', 'price_per_day')
    ordering      = ('brand', 'name')


# ─────────────────────────────────────────────
#  BOOKING ADMIN
# ─────────────────────────────────────────────
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ('id', 'name', 'phone', 'preferred_car', 'car_type',
                     'pickup_location', 'pickup_date', 'return_date',
                     'total_price', 'status', 'payment_status', 'created_at')
    list_filter   = ('status', 'payment_status', 'car_type', 'pickup_date')
    search_fields = ('name', 'phone', 'pickup_location', 'preferred_car')
    list_editable = ('status', 'payment_status')
    readonly_fields = ('created_at',)
    ordering      = ('-created_at',)
    date_hierarchy = 'created_at'


# ─────────────────────────────────────────────
#  CONTACT MESSAGE ADMIN
# ─────────────────────────────────────────────
@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display  = ('name', 'email', 'phone', 'subject', 'is_read', 'created_at')
    list_filter   = ('is_read', 'created_at')
    search_fields = ('name', 'email', 'subject', 'message')
    list_editable = ('is_read',)
    readonly_fields = ('name', 'email', 'phone', 'subject', 'message', 'created_at')
    ordering      = ('-created_at',)
