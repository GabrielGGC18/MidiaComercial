# Tasks do MidiaComercial (Equipe NidoQueen)

> Levantamento de 13/11/2026: rodamos todas as rotas da API com os 3 perfis (atendente, gerente e dono), navegamos as telas em 375 px e 1280 px e revisamos infra, agente e frontend.
> Cada task diz **o problema (com arquivo e linha), o passo a passo e o código de exemplo**. É para escrever na mão: o código de exemplo é guia, não é para colar sem entender.

## Divisão

| Pessoa | Frente | Tasks |
| --- | --- | --- |
| **Pessoa 1** | Infra, API e perfil atendente | [P1-01](P1-01-clone-novo-nao-sobe.md) · [P1-02](P1-02-docker-prod-sem-migrate.md) · [P1-03](P1-03-health-check.md) · [P1-04](P1-04-rate-limit.md) · [P1-05](P1-05-agendar-prazos-e-seguranca-prod.md) · [P1-06](P1-06-paginacao-clientes.md) · [P1-07](P1-07-perfil-atendente.md) · [P1-08](P1-08-sair-nao-volta-ao-login.md) |
| **Pessoa 2** | Agente, framework de IA, qualidade e perfil dono | [P2-01](P2-01-api-de-conversas.md) · [P2-02](P2-02-explicador-llm.md) · [P2-03](P2-03-avaliacao-do-agente.md) · [P2-04](P2-04-retencao-lgpd.md) · [P2-05](P2-05-perfil-dono-configuracoes.md) · [P2-06](P2-06-cobertura-no-ci.md) |
| **Pessoa 3** | Layout, responsividade e chat | [P3-01](P3-01-centralizacao-das-telas.md) · [P3-02](P3-02-menu-sanduiche.md) · [P3-03](P3-03-responsividade-telas-menores.md) · [P3-04](P3-04-chat-estilo-midia63.md) |

A Pessoa 3 tem menos tasks, mas são as maiores (o chat sozinho é cerca de 1,5 dia).

## Ordem sugerida

```
Dia 1  P1-01 ─ P1-08 ─ P1-02   P2-01 ─────────┐        P3-01 ─ P3-02
Dia 2  P1-03 ─ P1-04 ─ P1-05   P2-02 ─ P2-03  │        P3-03
Dia 3  P1-06 ─ P1-07           P2-04 ─ P2-05 ─ P2-06   P3-04 (precisa da P2-01)
```

**Bloqueios** (resolva primeiro):

- **P1-01:** quem clona o repositório hoje não consegue rodar o projeto.
- **P1-08:** "Sair" não leva ao login; só com F5 (bug reproduzido e com causa confirmada).
- **P1-02:** o deploy com Docker sobe com o banco vazio.
- **P3-01:** em monitor largo, o conteúdo fica colado na lateral.

**Dependências**

| Task | Depende de |
| --- | --- |
| P3-04 (chat) | P2-01 (API de conversas) |
| P2-05 (tela do dono) | P3-02 (menu sanduíche), para pôr o item no menu. Se o menu ainda não existir, ponha no menu atual |
| P1-06 (paginação) | Combine com a P3-03 antes de mexer em `ClientesPage.tsx` |

## Como trabalhar

1. **Branch por task:** `git checkout -b p1-01-clone-novo` a partir da `main` atualizada.
2. Leia a task inteira e abra os arquivos citados **antes** de escrever.
3. Escreva o teste primeiro quando a task pedir (backend sempre tem teste).
4. Rode a validação local:
   ```bash
   # backend
   ruff check . && ruff format --check .
   python manage.py makemigrations --check --dry-run
   pytest
   # frontend
   cd frontend && npm run typecheck && npm test && npm run build
   ```
5. Abra um PR com o título `P1-01: clone novo sobe sem .env` e marque o checklist "Pronto quando" da task.
6. **Nunca** commite `.env`, banco, CSV ou chave. O pre-commit e o CI barram, mas não conte com eles.
7. **Dados da VPS ficam fora do git:** `Deploy.md`, `deploy/`, `frontend/vercel.json` e `deploy-funcionamento-vps.md` estão no `.gitignore`. Neles há IP, domínios de produção, porta interna, usuário de serviço e caminhos. Nas tasks e nos PRs, use marcadores (`<RAIZ>`, `<usuario-servico>`, `<dominio-api>`).

## Regras do projeto (resumo)

- Toda query de domínio usa `.da_loja(request.loja)`. ID de outra loja dá **404**.
- Papel: `atendente < gerente < dono` (`apps/core/permissoes.py`).
- O agente **propõe** e a pessoa **confirma**. Dado pessoal nunca vai ao LLM.
- Frontend:
  - só tokens de cor (nada de hex);
  - geometria reta (`rounded-sm`/`rounded-md`; `rounded-full` só em avatar, ponto ao vivo e microfone);
  - status com ícone e texto.
- Confira as telas em **320, 375, 768, 1280 e 1920 px**, nos temas claro e escuro.

## Agentes do Claude Code para apoiar

Em `.claude/agents/` existem: `backend-django`, `frontend-react`, `agente-ia`, `infra-devops`, `design-thinking`, `product-owner` e **`chat-ui`** (novo, para a P3-04 e a responsividade). Peça para revisarem o seu código, não para escreverem a task por você.

## Status

| Task | Dono | Status |
| --- | --- | --- |
| P1-01 | Pessoa 1 | ⬜ a fazer |
| P1-02 | Pessoa 1 | ⬜ |
| P1-03 | Pessoa 1 | ⬜ |
| P1-04 | Pessoa 1 | ⬜ |
| P1-05 | Pessoa 1 | ⬜ |
| P1-06 | Pessoa 1 | ⬜ |
| P1-07 | Pessoa 1 | ⬜ |
| P1-08 | Pessoa 1 | ⬜ |
| P2-01 | Pessoa 2 | ⬜ |
| P2-02 | Pessoa 2 | ⬜ |
| P2-03 | Pessoa 2 | ⬜ |
| P2-04 | Pessoa 2 | ⬜ |
| P2-05 | Pessoa 2 | ⬜ |
| P2-06 | Pessoa 2 | ⬜ |
| P3-01 | Pessoa 3 | ⬜ |
| P3-02 | Pessoa 3 | ⬜ |
| P3-03 | Pessoa 3 | ⬜ |
| P3-04 | Pessoa 3 | ⬜ |

Legenda: ⬜ a fazer · 🟨 fazendo · 🟦 em revisão (PR aberto) · ✅ feito
