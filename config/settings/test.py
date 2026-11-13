import os

os.environ.setdefault("SECRET_KEY", "test-only")

from .base import *  # noqa: E402, F403

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True

# Rate limit folgado nos testes; test_rate_limit.py aperta com override_settings
MIDIA_LIMITE_LOGIN_IP = "10000/m"
MIDIA_LOGIN_MAX_FALHAS = 10000
MIDIA_LIMITE_AGENTE = MIDIA_LIMITE_IMPORTACAO = "10000/m"
