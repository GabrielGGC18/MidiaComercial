# ── web: Django + Gunicorn (só /api, /admin e /static) ──────────────────────
FROM python:3.12-slim AS web
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
# Só dependências de produção (pytest/ruff ficam fora da imagem; o CI instala .[dev] por conta própria)
RUN pip install --no-cache-dir .
COPY manage.py ./
COPY config ./config
COPY apps ./apps
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh  && DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=build-only python manage.py collectstatic --noinput
# Sem root. Na VPS o compose troca o uid/gid pelo do usuário `midiacomercial` do host
# (precisa ler o socket da ponte do Hermes).
RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app
EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "90", "--access-logfile", "-"]

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
