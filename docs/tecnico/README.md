# Documentação técnica do MidiaComercial

Para quem vai **mexer no código**. O produto e as decisões estão em `docs/01`–`docs/18`; aqui está como o
sistema funciona por dentro.

> Repositório público: estes documentos descrevem o desenho, nunca o acesso. IP, usuários, domínio da API,
> segredos e comandos reais da VPS ficam fora do Git (runbook local e pasta `deploy/`).

## Guias

| # | Guia | Para quê |
| --- | --- | --- |
| 1 | [Como rodar e configurar](01-como-rodar.md) | Ambiente local, settings, variáveis, comandos |
| 2 | [Backend: camadas e padrões](02-backend.md) | Apps, multi-loja, papéis, services, erros, API |
| 3 | [Fluxos ponta a ponta](03-fluxos.md) | Login, balcão, importação, motor, ação, agente, prospecção, avisos |
| 4 | [Frontend](04-frontend.md) | Rotas, sessão, cliente da API, estado, componentes, efeitos |
| 5 | [Segurança e privacidade](05-seguranca.md) | Isolamento, CSRF, rate limit, IP do cliente, LGPD |
| 6 | [Testes e qualidade](06-testes-e-qualidade.md) | Suítes, avaliação do agente, CI, checklist |

## Referência gerada do código

`python manage.py gerar_referencia` reescreve estes arquivos a partir do código. Rode de novo ao mudar rota,
modelo, comando ou setting.

- [Referência da API](referencia-api.md): todas as rotas, com o papel mínimo.
- [Referência dos modelos](referencia-modelos.md): campos, relações (diagrama ER) e escolhas.
- [Comandos e configurações](referencia-operacao.md): `manage.py` e settings `MIDIA_*` com o padrão do código.

## Mapa do código

```
config/                 settings (base/dev/test/prod), api.py (NinjaAPI + handlers de erro), urls
apps/
├── core/               ModeloDaLoja (.da_loja), middleware da loja, papéis, limites (rate limit),
│                       saúde, paginação, demo (seed), comando gerar_referencia
├── contas/             Loja, Vinculo (usuário × loja × papel), ConfiguracaoLoja, login/sessão
├── comercio/           Produto, Variante (tamanho/cor), Pedido, ItemPedido, Devolucao
├── estoque/            SnapshotEstoque (saldo por variante e data de captura)
├── importacao/         CSV de vendas e estoque: prévia → confirmação → reconciliação
├── publico/            DemandaNaoAtendida (balcão), perfil do público, catálogo
├── inteligencia/       motor: coleta → qualidade → regras → priorização → explicação → snapshot
├── acoes/              PlanoAcao, Medicao (antes/depois), EventoAuditoria (append-only)
├── clientes/           base de clientes com consentimento (único lugar com nome e WhatsApp)
├── agente/             orquestrador, ferramentas, provedores (offline/Hermes/Claude), prospecção
└── notificacoes/       barramento de eventos (Observer) e sino de avisos
frontend/
├── middleware.ts       proxy da Vercel: /api, /admin, /static → API
└── src/
    ├── api/            cliente HTTP (sessão + CSRF), sessão (AuthProvider), tipos
    ├── app/            rotas, layouts (AppShell, BalcaoShell), providers (TanStack Query)
    ├── features/       uma pasta por tela
    ├── components/     ui/ (base), midia/ (produto), efeitos/ (animações)
    └── lib/            formatação, papéis, termos de loja, utilidades
docker-compose.vps.yml  produção: db + web (gunicorn) + rotinas
Dockerfile              imagem de produção (sem deps de dev, usuário sem root)
```
