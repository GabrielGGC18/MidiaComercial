# P1-05 · Agendar `verificar_prazos` e endurecer a segurança de produção

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 2 h · **Depende de:** P1-02

## Problema

1. **Avisos que nunca saem:**
   - Os avisos "Ação atrasada" e "Estoque desatualizado" (padrão Observer) só são disparados pelo comando `python manage.py verificar_prazos` (`apps/notificacoes/management/commands/verificar_prazos.py`).
   - Nada agenda esse comando: não há cron, timer do systemd nem serviço no compose.
   - Em produção, esses dois avisos **nunca aparecem** no sino.
2. **Cabeçalhos de segurança faltando:** o `config/settings/prod.py` não tem HSTS, redirecionamento para HTTPS nem `Referrer-Policy`.

## Onde mexer

- `docker-compose.prod.yml` (opção Docker) **ou** `deploy/` com timer do systemd (opção VPS nativa, a do `Deploy.md`)
- `config/settings/prod.py`
- `Deploy.md`

## Passo a passo

### A) Agendamento

**Opção 1: VPS nativa (systemd), recomendada, porque é o caminho do deploy atual.**

> **A pasta `deploy/` e o `Deploy.md` são locais** (estão no `.gitignore`, porque têm dados da VPS). Crie os arquivos lá, na sua máquina, e passe para o Gabriel. Não suba para o git. Abaixo, `<RAIZ>` é a pasta do projeto no servidor e `<usuario-servico>` é o usuário do serviço: os valores reais estão no runbook local do Gabriel.

Crie `deploy/systemd/midiacomercial-prazos.service`:

```ini
[Unit]
Description=MidiaComercial: verificar prazos e estoque

[Service]
Type=oneshot
User=<usuario-servico>
WorkingDirectory=<RAIZ>
EnvironmentFile=<RAIZ>/.env
ExecStart=<RAIZ>/.venv/bin/python manage.py verificar_prazos
```

Crie `deploy/systemd/midiacomercial-prazos.timer`:

```ini
[Unit]
Description=Roda verificar_prazos de hora em hora

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Para instalar, o Gabriel roda (com confirmação, porque a VPS é compartilhada com outros serviços): `sudo systemctl enable --now midiacomercial-prazos.timer`.

**Opção 2: Docker.** Adicione um serviço que roda o comando em loop:

```yaml
prazos:
  build: { context: ., target: web }
  env_file: .env
  environment:
    DJANGO_SETTINGS_MODULE: config.settings.prod
  entrypoint: ["sh", "-c", "while true; do python manage.py verificar_prazos; sleep 3600; done"]
  depends_on:
    db:
      condition: service_healthy
  restart: unless-stopped
```

> **O comando pode rodar várias vezes?** Pode. O observador agrupa avisos repetidos em 24 h num contador (`notificar_na_tela`). Confira lendo `apps/notificacoes/observadores.py` antes de agendar de hora em hora.

### B) Segurança em `prod.py`

```python
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # comece com 30 dias; suba para 1 ano depois de validar
SECURE_HSTS_INCLUDE_SUBDOMAINS = False   # True só se TODOS os subdomínios tiverem HTTPS
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SESSION_COOKIE_AGE = 60 * 60 * 12        # sessão de 12 h (turno da loja)
```

> **Cuidado com o redirecionamento atrás de proxy.** O `SECURE_PROXY_SSL_HEADER` já está no `prod.py`. Se o proxy não mandar `X-Forwarded-Proto: https`, o `SECURE_SSL_REDIRECT` entra em loop de redirecionamento. Teste antes de ativar o HSTS: o HSTS fica gravado no navegador e é difícil de desfazer.

Rode `DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=x-teste python manage.py check --deploy`. Corrija os avisos ou justifique cada um no PR.

## Como testar

- **Agendamento:** em dev, crie um `PlanoAcao` com prazo vencido (o teste `apps/notificacoes/tests/test_observer.py::test_comando_verificar_prazos` mostra como). Rode o comando e veja o aviso no sino.
- **Segurança:** o `check --deploy` sai sem avisos críticos.

## Pronto quando

- [ ] Existe um agendamento: um serviço no compose (versionado) ou um timer do systemd (local, entregue ao Gabriel). Está documentado no `Deploy.md` local, sem dado real da VPS no git.
- [ ] O `prod.py` tem HSTS, redirecionamento para HTTPS, Referrer-Policy e duração da sessão.
- [ ] O resultado do `check --deploy` está colado no PR.
