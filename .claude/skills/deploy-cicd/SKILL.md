---
name: deploy-cicd
description: Use para publicar, diagnosticar ou mudar o deploy do MidiaComercial (front na Vercel, API em Docker numa VPS compartilhada, CI no GitHub Actions, CD por timer na VPS). Inclui as regras para não afetar os outros projetos da VPS.
---

# Deploy e CI/CD do MidiaComercial

Referência pública: `docs/14-DEPLOY-E-OPERACAO.md`. Comandos reais (acesso, IP, caminhos): runbook local
`deploy-funcionamento-vps.md` e pasta `deploy/`, ambos no `.gitignore`. **Nunca** copie o conteúdo deles para
arquivo versionado.

## Fluxo de branches

- `develop` = **teste** (API de teste na VPS, porta 8002, e preview da Vercel). `main` = **produção**.
- Trabalho novo: branch a partir da `develop` → PR para a `develop` → valida no teste → PR `develop → main`.
- Nunca commitar direto na `main`, exceto `hotfix/...` (depois trazer para a `develop`).
- O CD de cada ambiente só publica commit com o CI **daquela branch** verde.

## Publicar

1. Garanta CI verde localmente:
   - `ruff check . && ruff format --check . && python manage.py makemigrations --check --dry-run && pytest`
   - `cd frontend && npm run typecheck && npm test && npm run build`
2. Commit e push na `develop` (só com ordem do usuário); depois do teste, PR para a `main`.
3. Front: a Vercel publica sozinha.
4. API: o timer da VPS publica em até ~3 min **depois** que o CI passa. Acompanhe com `gh run list -L 1` e, na
   VPS, pelo journal do serviço de autodeploy (comando no runbook).
5. Verifique: `/api/saude` pelo domínio do front, login da demo, agente, `/admin/` com CSS.

## Diagnóstico rápido

| Sintoma | Causa provável |
| --- | --- |
| "O sistema está em manutenção" no site | `API_ORIGEM` ausente ou inválida na Vercel, ou API fora. Ver o log da Vercel (Functions) |
| `MIDDLEWARE_INVOCATION_FAILED` | Exceção em `frontend/middleware.ts` |
| API não atualizou | CI falhou ou está pendente, ou o commit foi marcado como falho pelo CD. Ver o journal do autodeploy |
| 429 para todo mundo | `API_SEGREDO` da Vercel diferente de `MIDIA_PROXY_SEGREDO` da API (todos parecem um IP só) |
| Agente responde genérico | Hermes caiu e houve fallback offline. Ver `SessaoAgente.fallback` e o log da ponte |
| CI falha no ruff sem mudança de código | Versão do ruff. Ela é fixa no `pyproject.toml` |

## Regras da VPS compartilhada (inegociáveis)

- Nunca `systemctl restart nginx`: só `nginx -t` e `reload`.
- Nunca reiniciar o Docker, o container do Hermes ou containers e sites de outros projetos.
- Nunca ler, imprimir ou copiar `.env` de outros projetos.
- Nunca rodar o deploy como root.
- Confirmar com o usuário antes de: `down -v`, restore de banco, `seed_demo --reset`, mudança no crontab ou no
  sudoers.

## Mudar a infraestrutura

- `Dockerfile`, `docker-compose.vps.yml`, `docker/entrypoint.sh`: versionados; o CD aplica.
- Scripts, units do systemd, nginx e ponte do Hermes: em `deploy/` (não versionado). Envie com o script de
  publicação do runbook e reinstale o que mudou.
- Migração destrutiva: backup antes. O rollback do CD volta o código, não o banco.
