# ── web: Django + Gunicorn (só /api e /admin) ───────────────────────────────
FROM python:3.12-slim AS web
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir ".[dev]"
COPY manage.py conftest.py ./
COPY config ./config
COPY apps ./apps
RUN DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=build python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

# ── frontend: build do React (Vite) ─────────────────────────────────────────
FROM node:22-alpine AS frontend
WORKDIR /front
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

# ── caddy: HTTPS + SPA + proxy /api /admin /static → web ────────────────────
FROM caddy:2-alpine AS caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend /front/dist /srv/frontend
