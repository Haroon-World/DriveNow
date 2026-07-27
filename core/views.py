import json
import re
from datetime import date, datetime

from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

from .models import Booking, ContactMessage, Car


# ─────────────────────────────────────────────
#  PAGE RENDERING VIEWS
# ─────────────────────────────────────────────

def home(request):
    return render(request, 'index.html')

def about(request):
    return render(request, 'about.html')

def cars(request):
    return render(request, 'cars.html')

def price(request):
    return render(request, 'price.html')

def contact(request):
    return render(request, 'contact.html')

def dashboard_view(request):
    return render(request, 'dashboard.html')

def admin_panel_view(request):
    return render(request, 'admin_panel.html')


# ─────────────────────────────────────────────
#  INTERNAL HELPERS
# ─────────────────────────────────────────────

def _parse_json(request):
    """Parse request body as JSON; raise ValueError on failure."""
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValueError('Invalid JSON payload')


def _get_authenticated_user(request):
    """
    Return the authenticated User or None.
    Checks Django session first. If no session is found, falls back
    to the X-Authenticated-User header (used for file:// testing
    where browsers block cross-origin session cookies).
    """
    user = request.user
    if user and user.is_authenticated:
        return user

    # Fallback for file:// testing without cookies
    auth_header = request.headers.get('X-Authenticated-User')
    if auth_header:
        try:
            return User.objects.get(username=auth_header)
        except User.DoesNotExist:
            pass

    return None


def _is_staff(request):
    """Return the User if they are an authenticated staff member, else None."""
    user = _get_authenticated_user(request)
    return user if (user and user.is_staff) else None


def _validate_phone(phone):
    """Returns True if phone looks like a plausible number."""
    return bool(re.match(r'^\+?[\d\s\-]{7,20}$', phone))


def _parse_date(date_str, field_name):
    """Parse YYYY-MM-DD string or raise ValueError."""
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        raise ValueError(f'Invalid {field_name}: expected YYYY-MM-DD')


# ─────────────────────────────────────────────
#  AUTH APIs
# ─────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_signup(request):
    try:
        data     = _parse_json(request)
        username = data.get('username', '').strip()
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        # Validate presence
        if not all([username, email, password]):
            return JsonResponse({'status': 'error', 'message': 'All fields are required.'}, status=400)

        # Validate username (alphanumeric + _ + -)
        if not re.match(r'^[\w\-]{3,30}$', username):
            return JsonResponse(
                {'status': 'error', 'message': 'Username must be 3–30 characters (letters, numbers, _ or -).'},
                status=400
            )

        # Validate email format
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'status': 'error', 'message': 'Invalid email address.'}, status=400)

        # Minimum password length
        if len(password) < 8:
            return JsonResponse(
                {'status': 'error', 'message': 'Password must be at least 8 characters.'},
                status=400
            )

        if User.objects.filter(username__iexact=username).exists():
            return JsonResponse({'status': 'error', 'message': 'Username already taken.'}, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Email already registered.'}, status=400)

        user = User.objects.create_user(username=username, email=email, password=password)
        login(request, user)

        return JsonResponse({
            'status':   'success',
            'message':  f'Welcome to DriveNow, {user.username}!',
            'username': user.username,
            'is_staff': user.is_staff,
        })

    except ValueError as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    except Exception as e:
        import django.db.utils
        if isinstance(e, django.db.utils.OperationalError):
            return JsonResponse({'status': 'error', 'message': 'Database connection problem, try again. Please ensure your XAMPP MySQL server is running.'}, status=500)
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)


@csrf_exempt
@require_http_methods(['POST'])
def api_login(request):
    try:
        data     = _parse_json(request)
        email    = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return JsonResponse({'status': 'error', 'message': 'Email and password are required.'}, status=400)

        # Resolve email → username for Django's authenticate()
        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            # Maybe they typed their username instead of email
            username = email

        user = authenticate(request, username=username, password=password)

        if user is not None:
            if not user.is_active:
                return JsonResponse({'status': 'error', 'message': 'Account is disabled.'}, status=403)
            login(request, user)
            return JsonResponse({
                'status':   'success',
                'message':  f'Welcome back, {user.username}!',
                'username': user.username,
                'is_staff': user.is_staff,
            })
        else:
            return JsonResponse({'status': 'error', 'message': 'Invalid email or password.'}, status=401)

    except ValueError as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    except Exception as e:
        import django.db.utils
        if isinstance(e, django.db.utils.OperationalError):
            return JsonResponse({'status': 'error', 'message': 'Database connection problem, try again. Please ensure your XAMPP MySQL server is running.'}, status=500)
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)


def logout_view(request):
    logout(request)
    return redirect('/')


# ─────────────────────────────────────────────
#  CARS API
# ─────────────────────────────────────────────

@require_http_methods(['GET'])
def api_cars(request):
    """Return all available cars as JSON for the frontend catalog."""
    cars_qs  = Car.objects.filter(is_available=True)
    car_type = request.GET.get('type', '').strip()
    if car_type and car_type.lower() != 'all':
        cars_qs = cars_qs.filter(car_type__iexact=car_type)

    data = []
    for car in cars_qs:
        data.append({
            'id':            car.id,
            'name':          car.name,
            'brand':         car.brand,
            'car_type':      car.car_type,
            'price_per_day': float(car.price_per_day),
            'image_url':     car.image_url or '',
            'description':   car.description or '',
            'seats':         car.seats,
            'transmission':  car.transmission,
            'fuel_type':     car.fuel_type,
        })
    return JsonResponse({'status': 'success', 'cars': data})


# ─────────────────────────────────────────────
#  BOOKING API
# ─────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_book(request):
    # 1. Auth check (method already guaranteed by decorator)
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({'status': 'error', 'message': 'Login required to book.'}, status=401)

    try:
        data            = _parse_json(request)
        name            = data.get('name', '').strip()
        phone           = data.get('phone', '').strip()
        pickup_location = data.get('pickup_location', '').strip()
        car_type        = data.get('car_type', '').strip()
        pickup_date_str = data.get('pickup_date', '')
        return_date_str = data.get('return_date', '')
        preferred_car   = data.get('preferred_car', '').strip()
        car_id          = data.get('car_id')

        # Required field check
        if not all([name, phone, pickup_location, pickup_date_str, return_date_str]):
            return JsonResponse({'status': 'error', 'message': 'Missing required fields.'}, status=400)

        # Validate phone
        if not _validate_phone(phone):
            return JsonResponse({'status': 'error', 'message': 'Invalid phone number format.'}, status=400)

        # Parse and validate dates
        p_date = _parse_date(pickup_date_str, 'pickup date')
        r_date = _parse_date(return_date_str, 'return date')

        if p_date < date.today():
            return JsonResponse({'status': 'error', 'message': 'Pickup date cannot be in the past.'}, status=400)
        if r_date < p_date:
            return JsonResponse({'status': 'error', 'message': 'Return date must be on or after pickup date.'}, status=400)

        days = max((r_date - p_date).days, 1)

        # Optional car linkage
        car_obj     = None
        total_price = float(data.get('total_price', 0.0))

        if car_id:
            try:
                car_obj     = Car.objects.get(id=car_id, is_available=True)
                # Ensure the total_price matches server side logic, though we trust client mostly here for demo
                # or fallback if 0
                if total_price == 0.0:
                    total_price = float(car_obj.price_per_day) * days
            except Car.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Selected car is not available.'}, status=400)
        else:
            # Fallback if car_id wasn't passed, but total_price is 0
            if total_price == 0.0:
                # Basic fallback rate if frontend didn't supply it
                total_price = 40000.0 * days

        booking = Booking.objects.create(
            user            = user,
            car             = car_obj,
            name            = name,
            phone           = phone,
            pickup_location = pickup_location,
            car_type        = car_type or (car_obj.car_type if car_obj else 'Not Specified'),
            preferred_car   = preferred_car or (f'{car_obj.brand} {car_obj.name}' if car_obj else ''),
            pickup_date     = p_date,
            return_date     = r_date,
            total_price     = total_price,
            status          = 'pending',
            payment_status  = 'unpaid',
        )

        # Mark the car as unavailable (reserved) once booking is placed
        if car_obj:
            car_obj.is_available = False
            car_obj.save(update_fields=['is_available'])

        # Simulated emails (fail_silently=True keeps them non-blocking)
        customer_email = user.email or f'{name.replace(" ", "").lower()}@example.com'
        send_mail(
            subject      = f'DriveNow Booking Confirmation #{booking.id}',
            message      = (
                f'Hi {name},\n\n'
                f'Your booking #{booking.id} has been received.\n'
                f'Car: {booking.preferred_car or booking.car_type}\n'
                f'Pickup: {pickup_location} on {pickup_date_str}\n'
                f'Return: {return_date_str}\n'
                f'Duration: {days} day(s)\n'
                f'Total: Rs {total_price:,.2f}\n\n'
                f'The DriveNow Team'
            ),
            from_email   = 'no-reply@drivenow.com',
            recipient_list = [customer_email],
            fail_silently = True,
        )
        send_mail(
            subject       = f'NEW BOOKING #{booking.id} — {name}',
            message       = (
                f'New booking by {name} ({phone})\n'
                f'Car: {booking.preferred_car}\n'
                f'Pickup: {pickup_location} | Dates: {pickup_date_str} → {return_date_str}\n'
                f'Duration: {days} day(s) | Total: Rs {total_price:,.2f}'
            ),
            from_email    = 'website@drivenow.com',
            recipient_list = ['admin@drivenow.com'],
            fail_silently = True,
        )

        return JsonResponse({
            'status':      'success',
            'message':     'Booking confirmed!',
            'booking_id':  booking.id,
            'total_price': float(booking.total_price),
            'days':        days,
        })

    except ValueError as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    except Exception as e:
        import django.db.utils
        if isinstance(e, django.db.utils.OperationalError):
            return JsonResponse(
                {'status': 'error', 'message': 'Database connection error. Please ensure XAMPP MySQL is running.'},
                status=500
            )
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)


# ─────────────────────────────────────────────
#  USER DASHBOARD API — my bookings
# ─────────────────────────────────────────────

@require_http_methods(['GET'])
def api_my_bookings(request):
    user = _get_authenticated_user(request)
    if not user:
        return JsonResponse({'status': 'error', 'message': 'Login required.'}, status=401)

    bookings = Booking.objects.filter(user=user).order_by('-created_at')
    data = []
    for b in bookings:
        data.append({
            'id':              b.id,
            'preferred_car':   b.preferred_car or b.car_type,
            'car_type':        b.car_type,
            'car_image':       (b.car.image_url if b.car else ''),
            'pickup_location': b.pickup_location,
            'pickup_date':     str(b.pickup_date),
            'return_date':     str(b.return_date),
            'days':            b.days(),
            'total_price':     float(b.total_price),
            'status':          b.status,
            'payment_status':  b.payment_status,
            'created_at':      b.created_at.strftime('%b %d, %Y'),
        })
    return JsonResponse({'status': 'success', 'bookings': data, 'username': user.username})


# ─────────────────────────────────────────────
#  ADMIN PANEL APIs (staff only)
# ─────────────────────────────────────────────

@require_http_methods(['GET'])
def api_admin_stats(request):
    """Dashboard stats for the admin panel."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    from django.db.models import Sum

    return JsonResponse({
        'status':               'success',
        'total_cars':           Car.objects.count(),
        'available_cars':       Car.objects.filter(is_available=True).count(),
        'total_bookings':       Booking.objects.count(),
        'pending_bookings':     Booking.objects.filter(status='pending').count(),
        'confirmed_bookings':   Booking.objects.filter(status='confirmed').count(),
        'total_revenue':        float(
            Booking.objects.filter(payment_status='paid').aggregate(total=Sum('total_price'))['total'] or 0
        ),
        'total_messages':       ContactMessage.objects.count(),
        'unread_messages':      ContactMessage.objects.filter(is_read=False).count(),
        'total_users':          User.objects.count(),
    })


@csrf_exempt
def api_admin_cars(request):
    """GET all cars (admin), POST create new car."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    if request.method == 'GET':
        cars_qs = Car.objects.all().order_by('brand', 'name')
        data = []
        for car in cars_qs:
            data.append({
                'id':            car.id,
                'name':          car.name,
                'brand':         car.brand,
                'car_type':      car.car_type,
                'price_per_day': float(car.price_per_day),
                'image_url':     car.image_url or '',
                'description':   car.description or '',
                'seats':         car.seats,
                'transmission':  car.transmission,
                'fuel_type':     car.fuel_type,
                'is_available':  car.is_available,
            })
        return JsonResponse({'status': 'success', 'cars': data})

    if request.method == 'POST':
        try:
            d = _parse_json(request)
            name  = d.get('name', '').strip()
            brand = d.get('brand', '').strip()
            price = d.get('price_per_day', 0)

            if not name or not brand:
                return JsonResponse({'status': 'error', 'message': 'Name and brand are required.'}, status=400)
            if float(price) <= 0:
                return JsonResponse({'status': 'error', 'message': 'Price must be greater than 0.'}, status=400)

            car = Car.objects.create(
                name          = name,
                brand         = brand,
                car_type      = d.get('car_type', 'Sedan'),
                price_per_day = price,
                image_url     = d.get('image_url', '').strip(),
                description   = d.get('description', '').strip(),
                seats         = max(1, int(d.get('seats', 5))),
                transmission  = d.get('transmission', 'Automatic'),
                fuel_type     = d.get('fuel_type', 'Petrol'),
                is_available  = bool(d.get('is_available', True)),
            )
            return JsonResponse({'status': 'success', 'message': 'Car added!', 'id': car.id})
        except ValueError as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_admin_car_detail(request, car_id):
    """PUT update car, DELETE remove car."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    try:
        car = Car.objects.get(id=car_id)
    except Car.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Car not found.'}, status=404)

    if request.method == 'PUT':
        try:
            d = _parse_json(request)
            car.name          = d.get('name', car.name).strip()
            car.brand         = d.get('brand', car.brand).strip()
            car.car_type      = d.get('car_type', car.car_type)
            car.price_per_day = d.get('price_per_day', car.price_per_day)
            car.image_url     = d.get('image_url', car.image_url or '').strip()
            car.description   = d.get('description', car.description or '').strip()
            car.seats         = max(1, int(d.get('seats', car.seats)))
            car.transmission  = d.get('transmission', car.transmission)
            car.fuel_type     = d.get('fuel_type', car.fuel_type)
            car.is_available  = bool(d.get('is_available', car.is_available))
            car.save()
            return JsonResponse({'status': 'success', 'message': 'Car updated!'})
        except ValueError as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)

    if request.method == 'DELETE':
        car.delete()
        return JsonResponse({'status': 'success', 'message': 'Car deleted!'})

    return JsonResponse({'status': 'error', 'message': 'Method not allowed.'}, status=405)


@require_http_methods(['GET'])
def api_admin_bookings(request):
    """GET all bookings."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    bookings = Booking.objects.select_related('user', 'car').order_by('-created_at')
    data = []
    for b in bookings:
        data.append({
            'id':              b.id,
            'name':            b.name,
            'phone':           b.phone,
            'preferred_car':   b.preferred_car or b.car_type,
            'car_type':        b.car_type,
            'pickup_location': b.pickup_location,
            'pickup_date':     str(b.pickup_date),
            'return_date':     str(b.return_date),
            'days':            b.days(),
            'total_price':     float(b.total_price),
            'status':          b.status,
            'payment_status':  b.payment_status,
            'user':            b.user.username if b.user else 'Guest',
            'created_at':      b.created_at.strftime('%b %d, %Y'),
        })
    return JsonResponse({'status': 'success', 'bookings': data})


@csrf_exempt
def api_admin_booking_update(request, booking_id):
    """PATCH: update status and/or payment_status."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return JsonResponse({'status': 'error', 'message': 'Booking not found.'}, status=404)

    if request.method in ('PATCH', 'POST'):
        try:
            d = _parse_json(request)
            valid_statuses  = [s[0] for s in Booking.STATUS_CHOICES]
            valid_payments  = [p[0] for p in Booking.PAYMENT_CHOICES]

            if 'status' in d:
                if d['status'] not in valid_statuses:
                    return JsonResponse({'status': 'error', 'message': 'Invalid status value.'}, status=400)
                booking.status = d['status']
            if 'payment_status' in d:
                if d['payment_status'] not in valid_payments:
                    return JsonResponse({'status': 'error', 'message': 'Invalid payment_status value.'}, status=400)
                booking.payment_status = d['payment_status']

            booking.save()
            return JsonResponse({'status': 'success', 'message': 'Booking updated!'})
        except ValueError as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)

    return JsonResponse({'status': 'error', 'message': 'Method not allowed.'}, status=405)


@require_http_methods(['GET'])
def api_admin_messages(request):
    """GET all contact messages."""
    staff = _is_staff(request)
    if not staff:
        return JsonResponse({'status': 'error', 'message': 'Staff access required.'}, status=403)

    messages_qs = ContactMessage.objects.all().order_by('-created_at')
    data = []
    for m in messages_qs:
        data.append({
            'id':         m.id,
            'name':       m.name,
            'email':      m.email,
            'phone':      m.phone or '',
            'subject':    m.subject,
            'message':    m.message,
            'is_read':    m.is_read,
            'created_at': m.created_at.strftime('%b %d, %Y %H:%M'),
        })
    return JsonResponse({'status': 'success', 'messages': data})


# ─────────────────────────────────────────────
#  CONTACT API
# ─────────────────────────────────────────────

@csrf_exempt
@require_http_methods(['POST'])
def api_contact(request):
    try:
        data    = _parse_json(request)
        name    = data.get('name', '').strip()
        email   = data.get('email', '').strip().lower()
        phone   = data.get('phone', '').strip()
        subject = data.get('subject', '').strip()
        message = data.get('message', '').strip()

        if not all([name, email, subject, message]):
            return JsonResponse({'status': 'error', 'message': 'Name, email, subject and message are required.'}, status=400)

        # Validate email
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'status': 'error', 'message': 'Invalid email address.'}, status=400)

        # Validate phone if provided
        if phone and not _validate_phone(phone):
            return JsonResponse({'status': 'error', 'message': 'Invalid phone number format.'}, status=400)

        ContactMessage.objects.create(
            name=name, email=email, phone=phone,
            subject=subject, message=message,
        )

        send_mail(
            subject       = f'DriveNow — Inquiry Received: {subject}',
            message       = (
                f'Hi {name},\n\n'
                f'We received your message:\n"{message}"\n\n'
                f'We\'ll reply within 1 hour.\n\nDriveNow Team'
            ),
            from_email    = 'support@drivenow.com',
            recipient_list = [email],
            fail_silently = True,
        )
        send_mail(
            subject       = f'NEW INQUIRY: {subject}',
            message       = (
                f'From: {name} ({email})\n'
                f'Phone: {phone or "N/A"}\n\n'
                f'Message:\n{message}'
            ),
            from_email    = 'website@drivenow.com',
            recipient_list = ['support@drivenow.com'],
            fail_silently = True,
        )

        return JsonResponse({'status': 'success', 'message': 'Message received! We\'ll get back to you soon.'})

    except ValueError as e:
        return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': 'An unexpected error occurred.'}, status=500)
