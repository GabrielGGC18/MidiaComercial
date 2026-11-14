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

## Melhoria 2: pós-venda e usabilidade (pesquisa com lojistas)

Base: [docs/10](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md). Foco: a pequena loja de moda que tem dificuldade de preencher dados, fazer pós-venda e manter contato. **PV** = dados e pós-venda. **UX** = usabilidade para o usuário final (vendedor no balcão, gerente e dono).

| Pessoa | Tasks |
| --- | --- |
| **Pessoa 1** | [PV-02](PV-02-mapeamento-de-colunas.md) · [PV-03](PV-03-catalogo-cor-tamanho.md) · [PV-04](PV-04-correcao-e-cancelamento-de-vendas.md) · [PV-09](PV-09-avisar-quando-chegar.md) (back) · [UX-02](UX-02-linguagem-de-loja.md) · [UX-04](UX-04-importacao-guiada.md) |
| **Pessoa 2** | [PV-01](PV-01-mensagem-honesta.md) · [PV-05](PV-05-vinculo-de-cliente.md) · [PV-06](PV-06-relacoes-de-catalogo.md) (back) · [PV-07](PV-07-recomendacao-por-compra-recente.md) · [PV-10](PV-10-desfecho-e-medicao.md) (back) · [PV-11](PV-11-aceitacao-e-cenario-de-demo.md) · [UX-05](UX-05-primeiro-uso-e-estados-vazios.md) · [UX-07](UX-07-detalhe-da-oportunidade.md) (back) |
| **Pessoa 3** | [PV-06](PV-06-relacoes-de-catalogo.md) (tela) · [PV-08](PV-08-cartoes-de-sugestao-e-historico.md) · [PV-10](PV-10-desfecho-e-medicao.md) (tela) · [UX-01](UX-01-inicio-hoje-e-menu-pela-rotina.md) · [UX-03](UX-03-balcao-em-tres-toques.md) · [UX-07](UX-07-detalhe-da-oportunidade.md) (tela) |
| **Gabriel + todos** | [PV-12](PV-12-conector-loja-piloto.md) (levantamento do sistema da loja) · [UX-06](UX-06-teste-com-lojista.md) (teste com lojista) |

**Corte do hackathon:**

1. **Bloqueios:** P1-01, P1-08, P1-02, P3-01 e **PV-01**.
2. **Cenário completo do boné preto:** PV-02, PV-03, PV-06, PV-07, PV-08, UX-01, UX-02, UX-07 e PV-11.
3. **Se sobrar tempo:** PV-04, PV-05, UX-03, UX-04 e PV-09.
4. **Depois do hackathon:** PV-10, UX-05, UX-06 e PV-12.

**Prioridade em relação às tasks P:** as tasks do cenário passam na frente de P2-02, P2-03, P2-04, P2-06 e P3-04 (chat). O chat continua importante, mas o usuário final ganha mais com a rotina (UX-01) e com a fila de sugestões (PV-08).

```
Dia 1  P1: PV-02 ─ PV-03          P2: PV-01 ─ PV-06(back) ─ PV-07 ──┐   P3: P3-01 ─ P3-02 ─ UX-01
Dia 2  P1: UX-02 ─ PV-04          P2: PV-07 ─ PV-11                  │   P3: PV-06(tela) ─ PV-08
Dia 3  P1: UX-04 ─ PV-09(back)    P2: PV-05 ─ PV-10(back)            └─▶ P3: UX-03 ─ PV-10(tela)
```

| Task | Depende de |
| --- | --- |
| PV-03 | PV-02 |
| PV-06 | PV-03 |
| PV-07 | PV-03 e PV-06 (PV-05 desejável) |
| PV-04, parte 4 (invalidar propostas) | PV-07 |
| PV-08 | PV-07 e UX-01 |
| PV-09 | PV-03 e PV-07; a tela entra na UX-03 |
| PV-10 | PV-07 e PV-08 |
| UX-01 | P3-01 e P3-02 |
| UX-04 | PV-02 |
| UX-05 | UX-01 |
| UX-07 | UX-02 (termos); o passo 1, bug da data, não depende de nada |

**Princípios que valem para todas** (resumo do docs/10 §4):

- **Fato ≠ hipótese.** Compra é fato; tamanho e consentimento têm origem própria; sugestão nunca vira preferência do cliente.
- **Clientes:** nunca unir por nome parecido.
- **Mensagens:** não prometem reserva nem tamanho não confirmado.
- **Envio:** abrir o WhatsApp não é envio confirmado.
- **Processamento:** todo processamento tem chave e não duplica.
- **Celular:** tudo funciona com uma mão em 375 px, com palavras de loja (UX-02).

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
7. **Dados da VPS ficam fora do git:** `Deploy.md`, `deploy/` e `deploy-funcionamento-vps.md` estão no `.gitignore`. Neles há IP, domínios de produção, porta interna, usuário de serviço e caminhos. Nas tasks e nos PRs, use marcadores (`<RAIZ>`, `<usuario-servico>`, `<dominio-api>`).

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

## Fluxo de trabalho (Git)

1. Crie a branch a partir da `develop`: `feat/PV-02-mapeamento`, `fix/...`.
2. PR para a **`develop`** (nunca direto para a `main`). Com CI verde, merge. A `develop` não publica nada.
3. Trate tudo na `develop` antes de seguir: checklist "Antes de enviar para a `main`" em
   [docs/14 §0](../14-DEPLOY-E-OPERACAO.md#0-fluxo-de-branches-e-ambientes).
4. PR `develop → main`: produção. O CI recusa PR para a `main` vindo de outra branch.

## Issues e milestones

As pendências viram issues no GitHub, agrupadas em milestones (Documentação e fluxo, Agente, Operação e
segurança, Telas pendentes, Dados reais e pós-venda). Abra o PR citando a issue (`Closes #N`) para ela fechar no
merge na `main`.

## Status

| Task | Dono | Status |
| --- | --- | --- |
| P1-01 | Pessoa 1 | ✅ (dev sobe sem `.env`; prod recusa chave de dev) |
| P1-02 | Pessoa 1 | ✅ (imagem sem deps de dev, usuário sem root, migrate no entrypoint) |
| P1-03 | Pessoa 1 | ✅ (200/503 sem detalhe; healthcheck do compose usa a rota) |
| P1-04 | Pessoa 1 | ✅ (login, agente e importação; IP pela Vercel com segredo) |
| P1-05 | Pessoa 1 | ✅ (container de rotinas; HSTS, HTTPS, Referrer-Policy, sessão de 12 h) |
| P1-06 | Pessoa 1 | ✅ (envelope `{itens,total,pagina,por_pagina,paginas}`; página na URL) |
| P1-07 | Pessoa 1 | ⬜ |
| P1-08 | Pessoa 1 | ✅ (Sair volta para a página inicial; teste em `api/sessao.test.tsx`) |
| P2-01 | Pessoa 2 | ✅ (`/api/agente/conversas`; 100 guardadas, 6 ao LLM; passos com rótulo) |
| P2-02 | Pessoa 2 | ⬜ |
| P2-03 | Pessoa 2 | ✅ (53 frases; `avaliar_agente`; offline 47/53 — docs/09 §8) |
| P2-04 | Pessoa 2 | ✅ (`limpar_agente`, diário no container de rotinas) |
| P2-05 | Pessoa 2 | ⬜ |
| P2-06 | Pessoa 2 | ⬜ |
| P3-01 | Pessoa 3 | ⬜ |
| P3-02 | Pessoa 3 | ⬜ |
| P3-03 | Pessoa 3 | ⬜ |
| P3-04 | Pessoa 3 | ⬜ |
| PV-01 | Pessoa 2 | ✅ (sem "separamos"; tamanho só se confirmado; `campos_incertos`; ver docs/18) |
| PV-02 | Pessoa 1 | ⬜ |
| PV-03 | Pessoa 1 | ⬜ |
| PV-04 | Pessoa 1 | ⬜ |
| PV-05 | Pessoa 2 | ⬜ |
| PV-06 | Pessoa 2 + 3 | ⬜ |
| PV-07 | Pessoa 2 | ⬜ |
| PV-08 | Pessoa 3 | ⬜ |
| PV-09 | Pessoa 1 + 3 | ⬜ |
| PV-10 | Pessoa 2 + 3 | ⬜ |
| PV-11 | Pessoa 2 + todos | ⬜ |
| PV-12 | Gabriel + todos | ⬜ |
| UX-01 | Pessoa 3 | ⬜ |
| UX-02 | Pessoa 1 | ⬜ |
| UX-03 | Pessoa 3 | ⬜ |
| UX-04 | Pessoa 1 | ⬜ |
| UX-05 | Pessoa 2 | ⬜ |
| UX-06 | Todos | ⬜ |
| UX-07 | Pessoa 3 + 2 | ✅ (tela usa `resumo`/`numeros`/`passos`/`alternativas`; "Lembrar depois"; docs/18) |

Legenda: ⬜ a fazer · 🟨 fazendo · 🟦 em revisão (PR aberto) · ✅ feito
