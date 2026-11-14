# 1. Como rodar e configurar

## 1.1 Local, sem Docker

```bash
# API em http://localhost:8000
python -m venv .venv
.venv/Scripts/activate              # Linux/macOS: source .venv/bin/activate
pip install ".[dev]"
python manage.py migrate
python manage.py seed_demo          # 2 lojas sintéticas, 90 dias de vendas, procuras, estoque, clientes
python manage.py runserver 8000

# SPA em http://localhost:5173 (o Vite encaminha /api e /admin para a :8000)
cd frontend && npm install && npm run dev
```

- **Sem `.env`, o dev funciona:** SQLite (`db.sqlite3`) e uma chave de dev pública. A produção recusa
  qualquer `SECRET_KEY` que comece com `dev-`, `test-` ou `build-only`.
- O proxy do Vite lê `VITE_API_TARGET` (padrão `http://localhost:8000`).
- Logins da demo (senha pública `demo1234`): `gerente.centro`, `dono.centro`, `ana` (atendente),
  `gerente.norte`, `bruno`.

## 1.2 Local com Docker

`docker compose up --build` (db Postgres + web + Vite) e depois
`docker compose exec web python manage.py seed_demo`. Bom como plano B da apresentação: roda sem internet,
com o agente offline.

## 1.3 Settings

| Módulo | Uso |
| --- | --- |
| `config/settings/base.py` | Comum: apps, banco por `DATABASE_URL`, settings `MIDIA_*` |
| `dev.py` | `DEBUG`, hosts locais, CSRF do Vite, chave de dev, WhiteNoise sem collectstatic |
| `test.py` | Hash de senha rápido, limites de requisição folgados |
| `prod.py` | HTTPS forçado (saúde isenta), HSTS de 30 dias sem subdomínios, cookies `Secure`, sessão de 12 h, cache compartilhado (DatabaseCache) para o rate limit, trava de `SECRET_KEY` |

O `manage.py` usa `config.settings.dev` por padrão; o container de produção define `config.settings.prod`.

## 1.4 Variáveis de ambiente

Os nomes e padrões estão em [referencia-operacao.md](referencia-operacao.md). Regras:

- Segredos (`SECRET_KEY`, senha do banco, `MIDIA_PROXY_SEGREDO`, `MIDIA_IA_API_KEY`) só no `.env` do servidor.
  Nunca no código, em variável `VITE_*` ou em commit.
- O `.env` nunca vai para o Git; o pre-commit e o CI bloqueiam `.env`, banco, dump e planilha.
- IA: `MIDIA_IA_HABILITADA=False` deixa o agente no provedor offline (padrão).

## 1.5 Comandos do dia a dia

| Comando | Quando |
| --- | --- |
| `seed_demo [--reset]` | Criar ou recriar as lojas demo. Também gera a primeira análise de oportunidades |
| `verificar_prazos` | Avisos de ação atrasada e estoque velho (em produção roda de hora em hora) |
| `limpar_agente [--simular]` | Retenção LGPD do texto do agente (em produção, diário) |
| `avaliar_agente [--provedor offline\|hermes\|claude]` | Acurácia do agente nas frases de balcão, sem gravar nada |
| `desbloquear_login <usuario>` | Zera o bloqueio global de login de uma conta |
| `gerar_referencia` | Regenera `docs/tecnico/referencia-*.md` |

## 1.6 Antes de abrir PR

```bash
ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run && pytest
cd frontend && npm run typecheck && npm test && npm run build
```

Fluxo de branches: `feat/… → develop → main` ([docs/14 §0](../14-DEPLOY-E-OPERACAO.md#0-fluxo-de-branches)).
