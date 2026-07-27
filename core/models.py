from django.db import models
from django.contrib.auth.models import User


# ─────────────────────────────────────────────
#  CAR MODEL  (managed by admin panel)
# ─────────────────────────────────────────────
class Car(models.Model):
    CAR_TYPE_CHOICES = [
        ('Sports', 'Sports Car'),
        ('SUV', 'SUV'),
        ('Luxury', 'Luxury'),
        ('Electric', 'Electric'),
        ('Sedan', 'Sedan'),
    ]
    TRANSMISSION_CHOICES = [
        ('Automatic', 'Automatic'),
        ('Manual', 'Manual'),
    ]
    FUEL_CHOICES = [
        ('Petrol', 'Petrol'),
        ('Diesel', 'Diesel'),
        ('Electric', 'Electric'),
        ('Hybrid', 'Hybrid'),
    ]

    name           = models.CharField(max_length=150)
    brand          = models.CharField(max_length=100)
    car_type       = models.CharField(max_length=20, choices=CAR_TYPE_CHOICES, default='Sedan')
    price_per_day  = models.DecimalField(max_digits=8, decimal_places=2)
    image_url      = models.CharField(max_length=500, blank=True, null=True,
                                      help_text="Relative path e.g. images/car-1.jpg or full URL")
    description    = models.TextField(blank=True, null=True)
    seats          = models.PositiveSmallIntegerField(default=5)
    transmission   = models.CharField(max_length=15, choices=TRANSMISSION_CHOICES, default='Automatic')
    fuel_type      = models.CharField(max_length=10, choices=FUEL_CHOICES, default='Petrol')
    is_available   = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['brand', 'name']

    def __str__(self):
        return f"{self.brand} {self.name} (Rs {self.price_per_day}/day)"


# ─────────────────────────────────────────────
#  BOOKING MODEL  (linked to user)
# ─────────────────────────────────────────────
class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
    ]
    PAYMENT_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid',   'Paid'),
    ]

    user             = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='bookings')
    car              = models.ForeignKey(Car, on_delete=models.SET_NULL, null=True, blank=True,
                                         related_name='bookings')
    name             = models.CharField(max_length=150)
    phone            = models.CharField(max_length=20)
    pickup_location  = models.CharField(max_length=200)
    car_type         = models.CharField(max_length=100, blank=True)
    preferred_car    = models.CharField(max_length=150, blank=True, null=True)
    pickup_date      = models.DateField()
    return_date      = models.DateField()
    total_price      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status           = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    payment_status   = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default='unpaid')
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.id} — {self.name} ({self.status})"

    def days(self):
        if self.pickup_date and self.return_date:
            delta = self.return_date - self.pickup_date
            return max(delta.days, 1)
        return 1


# ─────────────────────────────────────────────
#  CONTACT MESSAGE MODEL
# ─────────────────────────────────────────────
class ContactMessage(models.Model):
    name       = models.CharField(max_length=150)
    email      = models.EmailField()
    phone      = models.CharField(max_length=20, blank=True, null=True)
    subject    = models.CharField(max_length=250)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Message from {self.name} — {self.subject}"
