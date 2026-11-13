from .base import *  # noqa: F403

DEBUG = False

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

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

# IP real para o rate limit. Cadeia na VPS: navegador → Vercel (rewrite) → nginx → container.
# X-Forwarded-For chega como "cliente, ip-da-vercel": o cliente é o 2º da direita.
NINJA_NUM_PROXIES = env.int("NINJA_NUM_PROXIES", default=2)  # noqa: F405

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
