from .base import *  # noqa: F403

DEBUG = True
ALLOWED_HOSTS = ALLOWED_HOSTS or ["localhost", "127.0.0.1", "0.0.0.0"]  # noqa: F405
# Vite dev server (proxy /api → Django) envia Origin http://localhost:5173
CSRF_TRUSTED_ORIGINS = [  # noqa: F405
    *CSRF_TRUSTED_ORIGINS,  # noqa: F405
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# WhiteNoise sem collectstatic em dev
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
