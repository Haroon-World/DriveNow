"""
Django settings for drivenow_project.

Development-safe defaults are provided. For production:
  - Set SECRET_KEY via environment variable DN_SECRET_KEY
  - Set DEBUG=False via environment variable DN_DEBUG=0
  - Set ALLOWED_HOSTS via environment variable DN_ALLOWED_HOSTS (comma-separated)
"""

import os
from pathlib import Path

# ─────────────────────────────────────────────
#  BASE DIR
# ─────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent


# ─────────────────────────────────────────────
#  SECURITY
# ─────────────────────────────────────────────

# IMPORTANT: In production, set the DN_SECRET_KEY environment variable.
SECRET_KEY = os.environ.get(
    'DN_SECRET_KEY',
    'django-insecure-dev-only-change-this-in-production-abc123xyz'
)

# IMPORTANT: Set DN_DEBUG=0 in production.
DEBUG = os.environ.get('DN_DEBUG', '1') == '1'

# Hosts allowed to serve the app.
# In production, set DN_ALLOWED_HOSTS="yourdomain.com,www.yourdomain.com"
_raw_hosts = os.environ.get('DN_ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(',') if h.strip()]


# ─────────────────────────────────────────────
#  APPLICATIONS
# ─────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'core',
    'accounts',
]


# ─────────────────────────────────────────────
#  MIDDLEWARE
# ─────────────────────────────────────────────
MIDDLEWARE = [
    'core.middleware.CorsMiddleware',           # Must be first for CORS headers
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'drivenow_project.urls'


# ─────────────────────────────────────────────
#  TEMPLATES
# ─────────────────────────────────────────────
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR],          # Root-level templates (index.html, etc.)
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'drivenow_project.wsgi.application'


# ─────────────────────────────────────────────
#  DATABASE  — MySQL (local dev)
# ─────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.mysql',
        'NAME':     os.environ.get('DN_DB_NAME',     'drivenow_db'),
        'USER':     os.environ.get('DN_DB_USER',     'root'),
        'PASSWORD': os.environ.get('DN_DB_PASSWORD', ''),
        'HOST':     os.environ.get('DN_DB_HOST',     'localhost'),
        'PORT':     os.environ.get('DN_DB_PORT',     '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}


# ─────────────────────────────────────────────
#  PASSWORD VALIDATION
# ─────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ─────────────────────────────────────────────
#  INTERNATIONALIZATION
# ─────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Karachi'   # Pakistan Standard Time (UTC+5)
USE_I18N      = True
USE_TZ        = True


# ─────────────────────────────────────────────
#  STATIC FILES
# ─────────────────────────────────────────────
STATIC_URL       = '/static/'
STATICFILES_DIRS = [BASE_DIR]    # Serve files from project root in development


# ─────────────────────────────────────────────
#  EMAIL — Simulated (writes to files, not sent)
# ─────────────────────────────────────────────
EMAIL_BACKEND    = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH  = BASE_DIR / 'simulated_emails'
DEFAULT_FROM_EMAIL = 'no-reply@drivenow.com'


# ─────────────────────────────────────────────
#  MISC
# ─────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Session cookie settings (basic hardening)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
