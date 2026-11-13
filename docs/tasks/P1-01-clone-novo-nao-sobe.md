# P1-01 · Clone novo não sobe sem `.env` (bug P0)

**Dono:** Pessoa 1 · **Prioridade:** P0 (bloqueia a equipe) · **Estimativa:** 1 h · **Depende de:** nada

## Problema

Quem clona o repositório e roda `python manage.py runserver` recebe:

```
django.core.exceptions.ImproperlyConfigured: Set the SECRET_KEY environment variable
```

**Causa:**

- `config/settings/base.py:20` faz `SECRET_KEY = env("SECRET_KEY")`, sem valor padrão.
- O `.env.example` está no `.gitignore` (linha 10, `**/.env.*`), então quem clona não recebe o modelo de `.env`.
- O `test.py` já resolve isso para os testes (`os.environ.setdefault("SECRET_KEY", "test-only")`), mas o `dev.py` não.

## Onde mexer

- `config/settings/base.py`
- `config/settings/dev.py`
- `config/settings/prod.py`
- `README.md` (seção "Rodar local")

## Passo a passo

1. Em `base.py`, deixe a chave **opcional** na leitura:
   ```python
   SECRET_KEY = env("SECRET_KEY", default="")
   ```
2. Em `dev.py`, use uma chave de desenvolvimento **só quando não houver uma**:
   ```python
   # Chave só para a máquina do dev. Produção exige SECRET_KEY no ambiente (prod.py).
   SECRET_KEY = SECRET_KEY or "dev-inseguro-nao-use-em-producao"  # noqa: F405
   ```
3. Em `prod.py`, **falhe cedo** se a chave não vier. Produção nunca pode usar a de dev:
   ```python
   from django.core.exceptions import ImproperlyConfigured

   if not SECRET_KEY or SECRET_KEY.startswith("dev-"):  # noqa: F405
       raise ImproperlyConfigured("Defina SECRET_KEY no ambiente de produção.")
   ```
4. **Decisão do Gabriel:** o `.env.example` continua ignorado. Não mude o `.gitignore` sem falar com ele. Em vez disso, documente no README o mínimo para rodar:
   ```bash
   python -m venv .venv && .venv/Scripts/activate   # Linux/mac: source .venv/bin/activate
   pip install -e ".[dev]"
   python manage.py migrate
   python manage.py seed_demo
   python manage.py runserver
   ```
   Depois, explique que a IA fica desligada sem `.env` e liste as variáveis opcionais (`MIDIA_IA_*`, `DATABASE_URL`).

## Como testar

1. Renomeie o seu `.env` para `.env.bak`.
2. Rode `python manage.py check`. Deve passar.
3. Rode `DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py check`. Deve **falhar** com a mensagem do passo 3.
4. Volte o `.env` para o lugar.
5. Teste automatizado (crie em `apps/core/tests/test_settings.py`):
   ```python
   import importlib

   import pytest
   from django.core.exceptions import ImproperlyConfigured


   def test_prod_sem_chave_falha(monkeypatch):
       monkeypatch.setenv("SECRET_KEY", "")
       import config.settings.base as base

       importlib.reload(base)
       with pytest.raises(ImproperlyConfigured):
           import config.settings.prod as prod

           importlib.reload(prod)
   ```
   > Se o reload der trabalho com o `environ` lendo o `.env`, teste só o `check` do passo 3 manualmente e registre no PR.

## Pronto quando

- [ ] Clone limpo sobe com os 5 comandos do README, sem `.env`.
- [ ] `prod` sem `SECRET_KEY` (ou com a chave de dev) não sobe.
- [ ] O README está atualizado.
- [ ] `pytest` está verde.
