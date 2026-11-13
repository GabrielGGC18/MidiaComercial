# MidiaComercial: documentação

**Inteligência comercial para lojistas de shopping.** *Seus sinais de venda, em uma só mídia.*

Comece pelo **[11 · Problema e solução](11-PROBLEMA-E-SOLUCAO.md)**. Os documentos 01 a 10 registram o planejamento e as decisões; de 11 a 15, o sistema como está construído e no ar.

| # | Requisito da entrega | Documento |
| --- | --- | --- |
| 1 | Proposta e estrutura inicial das telas | [01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md](01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md) |
| 2 | Documentação inicial do projeto | [02-DOCUMENTACAO-INICIAL.md](02-DOCUMENTACAO-INICIAL.md) |
| 3 | Linguagem de programação escolhida | [03-LINGUAGEM-DE-PROGRAMACAO.md](03-LINGUAGEM-DE-PROGRAMACAO.md) |
| 4 | Arquitetura proposta | [04-ARQUITETURA-PROPOSTA.md](04-ARQUITETURA-PROPOSTA.md) |
| 5 | Plataforma e tecnologias adotadas | [05-PLATAFORMA-E-TECNOLOGIAS.md](05-PLATAFORMA-E-TECNOLOGIAS.md) |
| 6 | Como a tecnologia ou prática sorteada será incorporada | [06-TECNOLOGIA-SORTEADA.md](06-TECNOLOGIA-SORTEADA.md) |
| 7 | Evolução: período por nicho, faixa etária, voz, base de clientes e agente de vendas | [07-EVOLUCAO-AGENTE-PUBLICO.md](07-EVOLUCAO-AGENTE-PUBLICO.md) |
| 8 | Design: geometria reta, efeitos React Bits e telas mais intuitivas (proposta) | [08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md](08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md) |
| 9 | Decisão: framework de IA (LangChain/LangGraph × SDK direto) e modelo do agente | [09-DECISAO-FRAMEWORK-IA.md](09-DECISAO-FRAMEWORK-IA.md) |
| 10 | Adequação à pesquisa com lojistas: pós-venda, dados confiáveis e usabilidade (tasks PV e UX) | [10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md](10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md) |
| 16 | Análise estratégica: pesquisa, sistemas das lojas (SETA/"UNIX"), integração, critérios de avaliação e pitch | [16-ANALISE-ESTRATEGICA.md](16-ANALISE-ESTRATEGICA.md) |
| 11 | Problema e solução: o que a ferramenta entrega ao lojista | [11-PROBLEMA-E-SOLUCAO.md](11-PROBLEMA-E-SOLUCAO.md) |
| 12 | Arquitetura atual (como está construído e no ar) | [12-ARQUITETURA-ATUAL.md](12-ARQUITETURA-ATUAL.md) |
| 13 | Agente: estrutura, provedores (offline, Hermes, Claude), ferramentas e como estender | [13-AGENTE.md](13-AGENTE.md) |
| 14 | Deploy e operação: Vercel, VPS, CI e CD | [14-DEPLOY-E-OPERACAO.md](14-DEPLOY-E-OPERACAO.md) |
| 15 | Histórico da entrega e pendências | [15-HISTORICO-DA-ENTREGA.md](15-HISTORICO-DA-ENTREGA.md) |

Skills para agentes de código (Claude Code) em [`.claude/skills/`](../.claude/skills/); agentes especialistas em [`.claude/agents/`](../.claude/agents/).

## Resumo em uma tela

- **Problema:** o lojista tem sinais espalhados (o que vendeu, o que procuraram e não tinha, o que há no estoque) e nenhuma rotina para transformá-los em decisões verificáveis.
- **Solução:** uma camada ao lado do PDV que importa vendas e estoque, registra a demanda não atendida no balcão e entrega até 3 oportunidades com evidência, amostra e limitação, acompanhando a ação escolhida.
- **Diferencial:** observar compras **e não compras**, decidir e medir.
- **Stack:** Python 3.12 · Django 5 + Django Ninja · PostgreSQL 16 · React + TypeScript + Tailwind v4 + shadcn/ui (design system Mídia UI) · Docker · nginx · Hostinger VPS (API) · Vercel (front).
- **IA:** agente que ajuda a preencher dados e indica clientes para o produto parado; ele propõe e uma pessoa confirma. Offline por padrão; GPT via Hermes em produção.
- **Dados da demo:** 100% sintéticos.
