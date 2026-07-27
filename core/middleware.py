"""
CORS Middleware for DriveNow.

Allows cross-origin requests from specific origins during local development.
Correctly handles the constraint that Access-Control-Allow-Credentials: true
cannot be combined with Access-Control-Allow-Origin: * (browsers reject it).
"""

from django.http import HttpResponse


class CorsMiddleware:
    # Origins explicitly allowed to send credentialed requests.
    # Add production domains here if needed.
    ALLOWED_ORIGINS = {
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'null',
        'file://',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Handle pre-flight OPTIONS requests immediately
        if request.method == 'OPTIONS':
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)

        origin = request.META.get('HTTP_ORIGIN', '')

        if origin in self.ALLOWED_ORIGINS:
            # Credentialed cross-origin: echo back the specific origin
            response['Access-Control-Allow-Origin']      = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        elif not origin:
            # Same-origin or non-browser client: no CORS headers needed
            pass
        else:
            # Unknown origin: allow but without credentials
            # (e.g., public API consumers, curl, etc.)
            response['Access-Control-Allow-Origin'] = '*'

        response['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS, PUT, PATCH, DELETE'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization, X-Authenticated-User'
        response['Access-Control-Max-Age']        = '86400'   # Cache pre-flight for 24 h

        return response
