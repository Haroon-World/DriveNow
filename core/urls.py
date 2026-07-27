from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from . import views

urlpatterns = [
    # ── Pages ──────────────────────────────────
    path('',              views.home,             name='home'),
    path('index.html',    views.home,             name='home_html'),
    path('about.html',    views.about,            name='about'),
    path('cars.html',     views.cars,             name='cars'),
    path('price.html',    views.price,            name='price'),
    path('contact.html',  views.contact,          name='contact'),
    path('dashboard/',    views.dashboard_view,   name='dashboard'),
    path('dashboard.html',views.dashboard_view,   name='dashboard_html'),
    path('admin-panel/',  views.admin_panel_view, name='admin_panel'),
    path('admin_panel.html', views.admin_panel_view, name='admin_panel_html'),

    # ── Auth APIs ──────────────────────────────
    path('api/signup/',   views.api_signup,       name='api_signup'),
    path('api/login/',    views.api_login,        name='api_login'),
    path('logout/',       views.logout_view,      name='logout'),

    # ── Cars API ───────────────────────────────
    path('api/cars/',     views.api_cars,         name='api_cars'),

    # ── Booking APIs ───────────────────────────
    path('api/book/',     views.api_book,         name='api_book'),
    path('api/my-bookings/', views.api_my_bookings, name='api_my_bookings'),

    # ── Contact API ────────────────────────────
    path('api/contact/',  views.api_contact,      name='api_contact'),

    # ── Admin APIs (staff only) ─────────────────
    path('api/admin/stats/',    views.api_admin_stats,    name='api_admin_stats'),
    path('api/admin/cars/',     csrf_exempt(views.api_admin_cars),     name='api_admin_cars'),
    path('api/admin/cars/<int:car_id>/',
                                csrf_exempt(views.api_admin_car_detail), name='api_admin_car_detail'),
    path('api/admin/bookings/', views.api_admin_bookings, name='api_admin_bookings'),
    path('api/admin/bookings/<int:booking_id>/',
                                csrf_exempt(views.api_admin_booking_update), name='api_admin_booking_update'),
    path('api/admin/messages/', views.api_admin_messages, name='api_admin_messages'),
]
