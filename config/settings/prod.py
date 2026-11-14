from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

DEBUG = False

if not SECRET_KEY or SECRET_KEY.startswith(("dev-", "test-", "build-only")):  # noqa: F405
    # o collectstatic do build da imagem usa SECRET_KEY=build-only e não sobe servidor
    import sys

    if "collectstatic" not in sys.argv:
        raise ImproperlyConfigured("Defina SECRET_KEY de produção no .env (não use a de dev).")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
# HTTPS (o nginx manda X-Forwarded-Proto). A saúde fica fora do redirecionamento: o
# healthcheck do compose chama http://127.0.0.1 de dentro do container.
SECURE_SSL_REDIRECT = True
SECURE_REDIRECT_EXEMPT = [r"^api/saude$"]
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 dias; sem includeSubDomains (domínio compartilhado)
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_AGE = 60 * 60 * 12  # um turno de loja

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# Cache compartilhado entre os workers do gunicorn (contadores do rate limit).
# Sem Redis: tabela no próprio Postgres, criada pelo entrypoint (createcachetable).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "cache_midia",
    }
}

# IP do cliente para o rate limit: apps/core/limites.ip_cliente (segredo do proxy da
# Vercel ou X-Real-IP do nginx). O X-Forwarded-For não é usado: o cliente pode forjá-lo.

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
