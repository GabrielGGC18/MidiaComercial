# P1-04 · Limite de requisições (login, agente e importação)

**Dono:** Pessoa 1 · **Prioridade:** P1 (segurança e custo) · **Estimativa:** 2 h · **Depende de:** nada

## Problema

Nenhuma rota tem limite de requisições:

- **`POST /api/auth/login`** aceita tentativas ilimitadas de senha (força bruta).
- **`POST /api/agente/mensagens`** chama o LLM quando a IA está ligada: cada chamada custa tokens. Um script em loop gera conta alta.
- **`POST /api/importacoes/preview`** processa CSV de até 5 MB a cada chamada.

O Django Ninja 1.8 já traz isso pronto em `ninja.throttling`. **Não precisa de dependência nova.**

## Onde mexer

- `apps/contas/api.py` (login)
- `apps/agente/api.py` (mensagens)
- `apps/importacao/api.py` (preview)
- `config/settings/base.py` e `prod.py` (cache)

## Passo a passo

1. Entenda o mecanismo:
   - O throttle do Ninja guarda contadores no **cache do Django**.
   - Em dev, o cache padrão é em memória e vale por processo.
   - Em produção, o gunicorn roda com 3 workers. Com o cache em memória, cada worker conta separado e o limite real vira 3 vezes maior. Por isso o passo 5 usa um cache compartilhado.
2. Login, limite por IP (o usuário ainda não está autenticado):
   ```python
   from ninja.throttling import AnonRateThrottle

   @router.post("/auth/login", response=MeOut, auth=None, throttle=[AnonRateThrottle("5/m")])
   def entrar(request, payload: LoginIn):
       ...
   ```
3. Agente, limite por usuário logado:
   ```python
   from ninja.throttling import AuthRateThrottle

   @router.post("/mensagens", response=MensagemOut, throttle=[AuthRateThrottle("20/m")])
   ```
4. Importação: `throttle=[AuthRateThrottle("10/m")]` no `preview`.
5. Ponha o cache compartilhado em `prod.py`. O banco já existe, então não precisa de Redis:
   ```python
   CACHES = {
       "default": {
           "BACKEND": "django.core.cache.backends.db.DatabaseCache",
           "LOCATION": "cache_midia",
       }
   }
   ```
   Depois, rode `python manage.py createcachetable`. Coloque esse comando no `docker/entrypoint.sh` da P1-02, logo depois do `migrate`.
6. **Resposta 429:**
   - O Ninja levanta `Throttled`, que é filho de `HttpError`.
   - O handler de `HttpError` em `config/api.py:70` já devolve `{"detail": ...}`.
   - Confira se a mensagem sai em português. Se vier em inglês ("Request was throttled"), trate `Throttled` antes do `HttpError` e devolva `"Muitas tentativas. Espere um minuto e tente de novo."`.
7. Frontend: em `frontend/src/api/client.ts`, garanta que o `status === 429` mostra o `detail` no toast. Provavelmente isso já acontece via `mensagemErro`; só confira.
8. **IP atrás de proxy:**
   - O `AnonRateThrottle` usa `REMOTE_ADDR`, ou `X-Forwarded-For` quando `NINJA_NUM_PROXIES` está definido.
   - Atrás do Caddy ou do nginx, defina `NINJA_NUM_PROXIES = 1` em `prod.py`. Sem isso, todo mundo vira o mesmo IP (o do proxy) e o limite trava a loja inteira.

## Como testar

```python
# apps/contas/tests/test_rate_limit.py
from django.core.cache import cache


def test_login_bloqueia_apos_5(client, db):
    cache.clear()
    client.get("/api/csrf")
    token = client.cookies["csrftoken"].value
    for _ in range(5):
        client.post("/api/auth/login", {"username": "x", "password": "y"},
                    content_type="application/json", HTTP_X_CSRFTOKEN=token)
    r = client.post("/api/auth/login", {"username": "x", "password": "y"},
                    content_type="application/json", HTTP_X_CSRFTOKEN=token)
    assert r.status_code == 429
```

Faça um teste igual para `/api/agente/mensagens` com 21 chamadas. Use o `cache.clear()` no início de cada teste para um não contaminar o outro.

## Pronto quando

- [ ] A 6ª tentativa de login no mesmo minuto dá 429, com mensagem em português.
- [ ] O agente e a importação têm limite.
- [ ] O cache compartilhado está em produção e o `createcachetable` roda no entrypoint.
- [ ] `NINJA_NUM_PROXIES` está configurado em produção.
- [ ] Os testes passam e um não interfere no outro.
