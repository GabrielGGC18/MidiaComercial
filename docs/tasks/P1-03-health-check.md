# P1-03 · Health check `/api/saude`

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 1 h · **Depende de:** nada

## Problema

Não existe uma rota para saber se a API está viva. Hoje, o Docker, o Caddy, o nginx da VPS e qualquer monitor (UptimeRobot) só conseguem testar a home. A home é a SPA e não diz se o Django ou o banco caíram.

## Onde mexer

- `apps/core/api.py` (novo) ou o router raiz em `config/api.py`
- `config/api.py` (registrar o router)
- `apps/core/tests/test_saude.py` (novo)

## Passo a passo

1. A API tem autenticação global (veja `NinjaAPI(` em `config/api.py:23`). Por isso a rota precisa de `auth=None`, como `/api/csrf` em `apps/contas/api.py:76`.
2. Escreva a rota:
   ```python
   # apps/core/api.py
   import time

   from django.db import connection
   from ninja import Router, Schema

   router = Router(tags=["Infra"])


   class SaudeOut(Schema):
       ok: bool
       banco_ms: int


   @router.get("/saude", response={200: SaudeOut, 503: SaudeOut}, auth=None)
   def saude(request):
       t0 = time.monotonic()
       try:
           with connection.cursor() as c:
               c.execute("SELECT 1")
       except Exception:  # noqa: BLE001 - qualquer falha de banco = indisponível
           return 503, {"ok": False, "banco_ms": 0}
       return 200, {"ok": True, "banco_ms": int((time.monotonic() - t0) * 1000)}
   ```
   - **Não** devolva versão, hostname, variáveis nem a mensagem do erro: é rota pública.
3. Registre o router em `config/api.py`: `api.add_router("/", core_router)`. Confira o padrão já usado ali.
4. Escreva o teste:
   ```python
   def test_saude_publica(client, db):
       r = client.get("/api/saude")
       assert r.status_code == 200 and r.json()["ok"] is True
   ```
5. Ligue a rota no healthcheck do `docker-compose.prod.yml` (P1-02, passo 4) e cite no `Deploy.md`.

## Como testar

`curl -i localhost:8000/api/saude` deve devolver `200 {"ok": true, "banco_ms": 0}`. Com o Postgres parado (`docker compose stop db`), deve devolver `503`.

## Pronto quando

- [ ] A rota é pública, com 200 e 503 corretos.
- [ ] Não vaza detalhe interno.
- [ ] Tem teste.
- [ ] O healthcheck do compose usa a rota.
