#!/bin/sh
# Entrypoint da imagem web: prepara o banco e entrega o processo ao gunicorn.
set -e
# migrate é idempotente: aplica só o que falta (banco novo sobe sem passo manual)
python manage.py migrate --noinput
# tabela do cache compartilhado (rate limit entre os workers); idempotente
python manage.py createcachetable
# exec: o gunicorn vira PID 1 e recebe o SIGTERM do `docker stop`
exec "$@"
