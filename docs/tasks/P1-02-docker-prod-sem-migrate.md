# P1-02 · Docker de produção sobe sem migrate e com dependências de dev (bug P0)

**Dono:** Pessoa 1 · **Prioridade:** P0 · **Estimativa:** 2 h · **Depende de:** P1-01

## Problema

- **Banco sem tabelas:** o `Dockerfile` (alvo `web`) termina em `CMD ["gunicorn", ...]`. Nada roda `migrate`. No primeiro `docker compose -f docker-compose.prod.yml up`, o Postgres está vazio e toda requisição dá **500** (`relation "contas_loja" does not exist`).
- **Dependências de dev:** a linha `RUN pip install --no-cache-dir ".[dev]"` instala pytest, ruff e pre-commit na imagem de produção. A imagem fica maior e com mais superfície de ataque.
- **Arquivo de teste:** o `conftest.py` é copiado para a imagem sem necessidade.

## Onde mexer

- `Dockerfile` (alvo `web`)
- novo `docker/entrypoint.sh`
- `docker-compose.prod.yml`
- `.dockerignore` (confira se já ignora `.venv`, `node_modules`, `db.sqlite3` e `.env*`)

## Passo a passo

1. Crie o arquivo `docker/entrypoint.sh`:
   ```sh
   #!/bin/sh
   set -e
   # migrate é idempotente: aplica só o que falta
   python manage.py migrate --noinput
   # exec troca o processo: o gunicorn vira PID 1 e recebe o SIGTERM do docker stop
   exec "$@"
   ```
   > **Line endings:** salve com **LF**. Com CRLF, o container falha com `/bin/sh^M: not found`. No VS Code, clique em "CRLF" no rodapé e troque para "LF".
2. No `Dockerfile`, alvo `web`:
   ```dockerfile
   RUN pip install --no-cache-dir .
   COPY manage.py ./
   COPY config ./config
   COPY apps ./apps
   COPY docker/entrypoint.sh /entrypoint.sh
   RUN chmod +x /entrypoint.sh \
    && DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=build-only python manage.py collectstatic --noinput
   # usuário sem root
   RUN useradd --create-home app && chown -R app /app
   USER app
   EXPOSE 8000
   ENTRYPOINT ["/entrypoint.sh"]
   CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
   ```
   > Depois da P1-01, o `prod.py` recusa chaves começando com `dev-`. A chave `build-only` serve só para o collectstatic.
3. O CI instala `.[dev]` por conta própria (`.github/workflows/ci.yml`), então nada muda lá.
4. Em `docker-compose.prod.yml`, adicione o healthcheck do `web`. O endpoint vem da P1-03; se ela ainda não existir, deixe comentado:
   ```yaml
   web:
     healthcheck:
       test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/saude')"]
       interval: 15s
       retries: 5
   ```
5. Conferir o seed: em produção **não** rode `seed_demo` no entrypoint (ele cria dados fictícios). Para um ambiente de demo, rode à mão: `docker compose exec web python manage.py seed_demo`.

## Como testar

```bash
docker compose -f docker-compose.prod.yml build web
docker compose -f docker-compose.prod.yml up -d db web
docker compose -f docker-compose.prod.yml logs web | grep -i "apply\|migrat"   # deve listar as migrations
docker compose -f docker-compose.prod.yml exec web pip list | grep -i pytest   # não deve achar nada
docker compose -f docker-compose.prod.yml exec web whoami                      # app
```

Para os testes, use um `.env` de teste (nunca o de produção) com `SECRET_KEY`, `POSTGRES_PASSWORD`, `DOMINIO=localhost` e `ALLOWED_HOSTS=localhost`.

## Pronto quando

- [ ] Banco vazio + `up` = app funcionando, sem passo manual.
- [ ] A imagem não tem pytest, ruff nem pre-commit, e roda como usuário `app`.
- [ ] `docker stop` encerra em menos de 10 s (sinal chegando ao gunicorn).
- [ ] O `Deploy.md` cita o entrypoint.
