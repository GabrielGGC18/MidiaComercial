# MidiaComercial: Planejamento do Frontend e Design System "Mídia UI"

**Hackrun, primeira entrega (planejamento e definição técnica)**
**Versão:** 0.1, 13/11/2026
**Complementa:** `ARQUITETURA.md` (backend Django + Django Ninja)
**Decisão desta versão:** o frontend passa a ser **React (SPA)** consumindo a API JSON do Django. As telas HTMX do `ARQUITETURA.md` ficam substituídas por este documento.

---

## Sumário

1. [Conceito: por que "Mídia"](#1-conceito-por-que-mídia)
2. [Stack do frontend](#2-stack-do-frontend)
3. [Referências e plataformas pesquisadas](#3-referências-e-plataformas-pesquisadas)
4. [Design System Mídia UI](#4-design-system-mídia-ui)
5. [Componentes](#5-componentes)
6. [Arquitetura do frontend](#6-arquitetura-do-frontend)
7. [Telas e composição](#7-telas-e-composição)
8. [Integração com o backend](#8-integração-com-o-backend)
9. [Plano de construção](#9-plano-de-construção)
10. [Qualidade, acessibilidade e definição de pronto](#10-qualidade-acessibilidade-e-definição-de-pronto)
11. [Fontes](#11-fontes)

---

## 1. Conceito: por que "Mídia"

**MidiaComercial** trata a loja como um **meio por onde passam sinais**: o que vendeu (caixa), o que foi procurado e não encontrado (balcão), o que tem no estoque e o que a equipe decidiu fazer. A plataforma é o **meio de integração** que junta esses sinais e devolve decisões.

Essa ideia guia a identidade visual:

| Ideia | Tradução visual |
| --- | --- |
| **Sinal** (dado que chega) | Ícone de ondas, indicadores de "ao vivo", barras de intensidade |
| **Integração** (fontes que se conectam) | Linhas e conectores entre cartões, chips de origem ("Vendas", "Balcão", "Estoque") |
| **Clareza** (decidir com evidência) | Muito espaço em branco, números grandes com fonte tabular, limitação sempre visível |
| **Comércio local** (Palmas, lojista real) | Linguagem simples, tom caloroso, coral como acento humano sobre o violeta tecnológico |

**Assinatura da marca:** *"Seus sinais de venda, em uma só mídia."*

### Logotipo (conceito)

```
  ▮▮▯  MídiaComercial
  └─ três barras de sinal; a terceira em coral = "o sinal que faltava" (a demanda não atendida)
```

Wordmark em **Plus Jakarta Sans 800**: "Mídia" em violeta e "Comercial" em tinta. O ícone sozinho (as três barras) serve de favicon e de avatar.

---

## 2. Stack do frontend

| Necessidade | Escolha | Por quê |
| --- | --- | --- |
| Framework | **React 19 + TypeScript** | Pedido da equipe; tipagem evita bug de integração |
| Build/dev | **Vite** | Rápido, sem SSR (não precisamos de SEO num painel logado) |
| Estilo | **Tailwind CSS v4** (`@theme` com tokens) | Já decidido; tokens viram CSS variables |
| Componentes base | **shadcn/ui** (Radix por baixo) | Código fica no nosso repo e é customizável; acessível |
| Gráficos | **shadcn/ui Charts (Recharts)** | Herdam os tokens do tema automaticamente; Tremor como alternativa |
| Tabelas | **TanStack Table** | Ordenação, filtro e paginação para ranking de demanda e planos |
| Dados do servidor | **TanStack Query** | Cache, loading/erro e revalidação sem Redux |
| Rotas | **React Router 7** | Rotas protegidas por papel |
| Formulários | **React Hook Form + Zod** | Validação no cliente igual aos schemas do backend |
| Cliente da API | **Orval** gerando hooks a partir do OpenAPI do Django Ninja (`/api/openapi.json`) | Tipos e hooks prontos; contrato único |
| Mocks | **MSW (Mock Service Worker)** | Frontend avança antes do backend; dados mockados na demo se precisar |
| Ícones | **lucide-react** | Já é o padrão do shadcn |
| Notificações | **Sonner** | Toasts bonitos, já integrados ao shadcn |
| Datas/números | **date-fns (pt-BR)** + `Intl.NumberFormat("pt-BR")` | R$ e datas no padrão brasileiro |
| Animação | **Motion** (antigo Framer Motion), com moderação | Entrada dos cartões e da contagem de números |
| Testes | **Vitest + Testing Library**; Playwright (P1) | Componentes de domínio e fluxo principal |
| Qualidade | **ESLint + Prettier** (ou Biome) | Padrão único |

**Ponto de partida recomendado:** inicializar com `npm create vite@latest` + `npx shadcn@latest init` e **copiar padrões de layout do Shadcn Admin** (Vite + shadcn, open source, MIT): sidebar, header, troca de tema, busca Cmd+K. Não clonar o template inteiro, para não carregar páginas que não usaremos.

---

## 3. Referências e plataformas pesquisadas

### 3.1 Bases de código (templates e blocos)

| Plataforma | O que é | Como usamos | Custo |
| --- | --- | --- | --- |
| **shadcn/ui** (ui.shadcn.com) | Componentes copiáveis sobre Radix + Tailwind v4 | **Base de todos os componentes** | Grátis |
| **Shadcn Admin** (satnaing, GitHub) | Dashboard Vite + shadcn mais popular do GitHub (~11 mil estrelas), com auth, Cmd+K e tema escuro | **Referência de layout** (sidebar, header, tema) | Grátis |
| **Tremor** (tremor.so) | 35+ componentes de dashboard sobre Tailwind e Radix, mais de 250 blocos | Referência para KPI tiles, BarList e trackers | Grátis |
| **shadcnblocks.com** | Blocos de dashboard e gráficos prontos para shadcn | Inspiração para os cartões de gráfico do "Meu público" | Grátis + pago |
| **ReUI** (reui.io) | Blocos de dashboard que reagem às variáveis de tema | Inspiração para KPI + grid de exceções | Grátis |
| **Untitled UI React** | Componentes React com Tailwind e React Aria, exemplos de dashboard | Referência de acabamento visual (tipografia, espaçamento) | Grátis + pago |
| **Ant Design Pro / React Admin / Refine** | Frameworks de admin completos | **Não usar**: pesados e com outra linguagem visual | — |

### 3.2 Inspiração visual (telas reais de produto)

| Plataforma | Melhor para | O que procurar lá |
| --- | --- | --- |
| **Mobbin** (mobbin.com) | Fluxos reais de apps web e mobile | "import CSV", "empty state", "mobile form" |
| **SaaSFrame** (saasframe.io) | Telas e fluxos de produtos SaaS B2B | "analytics dashboard", "insights", "recommendations" |
| **Refero** (refero.design) | Galeria curada de telas reais, com bons filtros | "KPI cards", "data table", "onboarding" |
| **SaaSUI** (saasui.design) | Dashboards organizados por tipo de tela | "dashboard", "settings", "empty states" |
| **Nicelydone** | Telas e fluxos SaaS | "upload", "stepper" |
| **Dribbble** | Exploração estética (conceitos, nem sempre produto real) | "retail dashboard", "inventory insights" |

**Regra da equipe:** inspiração de **padrão** vem de Mobbin/SaaSFrame/Refero (produto real); inspiração de **estética** vem de Dribbble. Nada é copiado pixel a pixel; marcas e telas de terceiros não entram na demo.

### 3.3 Produtos que servem de norte estético

Linear (densidade e tipografia), Stripe Dashboard (números e tabelas), Vercel (modo escuro e contraste), Shopify Admin (linguagem para lojista). Use só como referência de qualidade; a identidade é própria.

---

## 4. Design System Mídia UI

> A referência navegável (cores, tipografia, componentes com prévia) está publicada como artefato **"Mídia UI: Design System do MidiaComercial"**. Este capítulo é a versão em texto, para o repositório.

### 4.1 Princípios

1. **Evidência antes de opinião.** Todo número mostra origem, período e amostra.
2. **A limitação é parte do dado.** Nunca escondida em tooltip; aparece no cartão.
3. **Um toque no balcão.** O atendente registra demanda sem digitar.
4. **Calma, não alarme.** Cores fortes só para status; o resto é neutro.
5. **Português de loja.** "Procuraram e não tinha", não "demanda reprimida".

### 4.2 Cores

#### Marca

| Token | Hex | Uso |
| --- | --- | --- |
| `violeta-50` | `#F1EEFF` | Fundo de destaque suave |
| `violeta-100` | `#E2DCFF` | Hover, chips selecionados |
| `violeta-300` | `#A898FF` | Bordas de foco, gráficos secundários |
| `violeta-500` | `#6D4AFF` | **Primária**: botões, links, série principal |
| `violeta-600` | `#5B35F0` | Hover da primária |
| `violeta-700` | `#4A27C9` | Texto sobre fundo violeta claro |
| `violeta-900` | `#2A1677` | Header escuro, ilustrações |
| `coral-100` | `#FFE6DC` | Fundo de destaque da demanda |
| `coral-500` | `#FF6A3D` | **Acento**: demanda não atendida, "o sinal que faltava" |
| `coral-700` | `#C9461E` | Texto coral com contraste AA |

#### Neutros "Tinta" (levemente azulados)

| Token | Hex | Claro | Escuro |
| --- | --- | --- | --- |
| `tinta-50` | `#F7F8FC` | Fundo da página | Texto principal |
| `tinta-100` | `#EEF1F7` | Fundo de seção | — |
| `tinta-200` | `#DDE2EE` | Bordas | — |
| `tinta-300` | `#B9C0D4` | Bordas fortes, desabilitado | Texto terciário |
| `tinta-500` | `#64708F` | Texto secundário | Texto secundário |
| `tinta-700` | `#2F3A5F` | — | Bordas |
| `tinta-800` | `#1E2747` | — | Superfície elevada |
| `tinta-900` | `#121933` | Texto principal | Superfície (cards) |
| `tinta-950` | `#0B1020` | — | Fundo da página |

#### Semânticas (status de evidência)

| Status | Token | Cor | Fundo | Texto | Ícone |
| --- | --- | --- | --- | --- | --- |
| Dados suficientes | `sinal-ok` | `#12B76A` | `#E7F8EF` | `#067647` | `signal-high` |
| Amostra limitada | `sinal-atencao` | `#F79009` | `#FEF4E6` | `#B54708` | `signal-medium` |
| Cálculo bloqueado | `sinal-bloqueado` | `#64708F` | `#EEF1F7` | `#2F3A5F` | `lock` |
| Erro | `erro` | `#F04438` | `#FEECEB` | `#B42318` | `circle-alert` |
| Informação | `info` | `#2E90FA` | `#EAF4FF` | `#175CD3` | `info` |

> Status **nunca** depende só da cor: sempre ícone + rótulo escrito.

#### Visualização de dados

| Ordem | Nome | Hex |
| --- | --- | --- |
| 1 | Violeta | `#6D4AFF` |
| 2 | Coral | `#FF6A3D` |
| 3 | Turquesa | `#14B8A6` |
| 4 | Âmbar | `#F5B700` |
| 5 | Azul | `#2E90FA` |
| 6 | Magenta | `#D444F1` |

Sequencial (heatmap dia × hora): `#F1EEFF → #A898FF → #6D4AFF → #2A1677`. Em gráfico de uma série só, usar violeta; coral fica reservado para "demanda não atendida" em qualquer gráfico.

### 4.3 Tipografia

| Papel | Fonte | Peso |
| --- | --- | --- |
| Títulos e números de destaque | **Plus Jakarta Sans** | 600 / 700 / 800 |
| Interface e texto | **Inter** | 400 / 500 / 600 |
| SKU, IDs, códigos | **JetBrains Mono** | 500 |

Números sempre com `font-variant-numeric: tabular-nums`.

| Token | Tamanho / altura | Uso |
| --- | --- | --- |
| `display` | 36 / 44, Jakarta 800 | Número-herói do KPI |
| `h1` | 30 / 38, Jakarta 700 | Título da página |
| `h2` | 24 / 32, Jakarta 700 | Seção |
| `h3` | 18 / 26, Jakarta 600 | Título de cartão |
| `body-lg` | 16 / 24, Inter 400 | Texto de leitura |
| `body` | 14 / 20, Inter 400 | Padrão da interface |
| `small` | 12 / 16, Inter 500 | Legendas, metadados |
| `overline` | 11 / 16, Inter 600, caixa alta, +0,08em | Rótulos de seção ("EVIDÊNCIA") |

### 4.4 Espaço, forma e profundidade

| Categoria | Tokens |
| --- | --- |
| Espaçamento (base 4 px) | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 |
| Raio | `sm` 6 · `md` 10 · `lg` 14 (cards) · `xl` 20 (modais, hero) · `full` (chips, avatar) |
| Sombra | `xs` borda sutil · `sm` cards · `md` popovers · `foco` anel violeta 3 px a 35% |
| Movimento | 150 ms (hover) · 220 ms (entrada) · `ease-out`; respeitar `prefers-reduced-motion` |
| Layout | Sidebar 264 px (recolhe para 72 px) · conteúdo máx. 1280 px · grid de 12 colunas · gutter 24 |
| Quebras | `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 |
| Alvo de toque | Mínimo 44 × 44 px; no balcão, botões de 56 px |

### 4.5 Tokens em código (Tailwind v4)

```css
/* src/styles/tokens.css */
@import "tailwindcss";

@theme {
  --font-display: "Plus Jakarta Sans", ui-sans-serif, system-ui;
  --font-sans: "Inter", ui-sans-serif, system-ui;
  --font-mono: "JetBrains Mono", ui-monospace;

  --color-violeta-50:  #F1EEFF;
  --color-violeta-100: #E2DCFF;
  --color-violeta-300: #A898FF;
  --color-violeta-500: #6D4AFF;
  --color-violeta-600: #5B35F0;
  --color-violeta-700: #4A27C9;
  --color-violeta-900: #2A1677;

  --color-coral-100: #FFE6DC;
  --color-coral-500: #FF6A3D;
  --color-coral-700: #C9461E;

  --color-tinta-50:  #F7F8FC;
  --color-tinta-100: #EEF1F7;
  --color-tinta-200: #DDE2EE;
  --color-tinta-300: #B9C0D4;
  --color-tinta-500: #64708F;
  --color-tinta-700: #2F3A5F;
  --color-tinta-800: #1E2747;
  --color-tinta-900: #121933;
  --color-tinta-950: #0B1020;

  --color-sinal-ok: #12B76A;
  --color-sinal-atencao: #F79009;
  --color-sinal-bloqueado: #64708F;
  --color-erro: #F04438;
  --color-info: #2E90FA;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
}

/* Mapeamento para as variáveis que o shadcn/ui espera */
:root {
  --background: var(--color-tinta-50);
  --foreground: var(--color-tinta-900);
  --card: #FFFFFF;
  --card-foreground: var(--color-tinta-900);
  --primary: var(--color-violeta-500);
  --primary-foreground: #FFFFFF;
  --accent: var(--color-coral-500);
  --accent-foreground: #FFFFFF;
  --muted: var(--color-tinta-100);
  --muted-foreground: var(--color-tinta-500);
  --border: var(--color-tinta-200);
  --ring: var(--color-violeta-300);
  --destructive: var(--color-erro);
  --radius: var(--radius-lg);
  --chart-1: #6D4AFF; --chart-2: #FF6A3D; --chart-3: #14B8A6;
  --chart-4: #F5B700; --chart-5: #2E90FA;
}

.dark {
  --background: var(--color-tinta-950);
  --foreground: var(--color-tinta-50);
  --card: var(--color-tinta-900);
  --card-foreground: var(--color-tinta-50);
  --muted: var(--color-tinta-800);
  --muted-foreground: var(--color-tinta-300);
  --border: var(--color-tinta-700);
  --primary: #8466FF;            /* violeta um pouco mais claro no escuro */
}
```

### 4.6 Voz e microcopy

| Evite | Prefira |
| --- | --- |
| "Demanda reprimida detectada" | "9 clientes procuraram e não tinha" |
| "Confiança: 87%" | "Dados suficientes" / "Amostra pequena" |
| "Erro 422: payload inválido" | "A linha 14 está sem data. Corrija e envie de novo." |
| "Insight gerado por IA" | "Por que estamos sugerindo isso" |
| "Cliente perdido" | "Sem compra nos últimos 60 dias" |

---

## 5. Componentes

### 5.1 Base (shadcn/ui, recebendo os tokens)

Button · Input · Select · Combobox · Checkbox · Switch · Tabs · Card · Badge · Dialog · Sheet (gaveta mobile) · Dropdown Menu · Tooltip · Popover · Calendar/Date Range · Table · Skeleton · Progress · Sonner · Sidebar · Command (Cmd+K) · Chart.

**Variações de Button:** `primary` (violeta) · `secondary` (contorno tinta) · `ghost` · `danger` · `balcao` (56 px de altura, largura total, para o atendente).

### 5.2 Componentes de domínio (o que deixa o produto com cara própria)

| Componente | Propósito | Props principais |
| --- | --- | --- |
| `SignalBadge` | Status da evidência: suficiente, limitada, bloqueada | `status`, `motivo?` |
| `SourceChip` | De onde veio o dado ("Vendas", "Balcão", "Estoque") com ícone | `fonte` |
| `KpiTile` | Número-herói + variação + período + amostra | `rotulo`, `valor`, `formato`, `periodo`, `amostra`, `nota?` |
| `OpportunityCard` | Cartão de oportunidade (o centro da demo) | `oportunidade`, `onCriarAcao`, `onDescartar` |
| `EvidenceList` | Lista de evidências com SourceChip, valor e amostra | `evidencias[]` |
| `LimitationNote` | Faixa de limitação, sempre visível | `texto` |
| `BlockedRuleRow` | Regra bloqueada e o que falta para liberar | `regra`, `motivo`, `comoLiberar` |
| `ImportStepper` | Passos Arquivo → Prévia → Confirmar | `etapa` |
| `DropzoneCsv` | Área de upload com modelo para baixar | `onArquivo`, `tipo` |
| `ReconciliationBar` | Barra importado × origem com diferença | `importado`, `origem` |
| `RejectedRowsTable` | Linhas rejeitadas com mensagem em português | `linhas[]` |
| `DemandQuickForm` | Registro no balcão em ≤ 4 toques | `onRegistrar` |
| `SizePicker` / `ReasonPicker` | Chips grandes de tamanho e motivo | `opcoes`, `valor` |
| `DemandRanking` | Ranking por variante × motivo (barras coral) | `itens[]` |
| `HeatmapWeek` | Mapa dia × hora (escala violeta) | `celulas[]` |
| `CategoryBars` | Participação por categoria, trocando receita/unidades/pedidos | `dados`, `unidade` |
| `CoverageNote` | "41% dos pedidos têm cliente identificado" | `percentual`, `total` |
| `ActionCard` | Plano de ação com responsável, prazo, indicador e antes/depois | `acao` |
| `BeforeAfter` | Comparação de indicador com aviso de associação | `antes`, `depois`, `periodos` |
| `EmptyState` | Estado vazio com ilustração em linhas e próximo passo | `titulo`, `acao` |
| `DemoRibbon` | Selo fixo "DADOS DE DEMONSTRAÇÃO" | — |
| `StoreSwitcher` | Troca de loja (demo de isolamento) | `lojas[]` |

### 5.3 Anatomia do `OpportunityCard`

```
┌─────────────────────────────────────────────────────────────┐
│ ① ▮▮▯ LACUNA DE MIX                     [▮▮▮ Dados suficientes]│  ← overline + SignalBadge
│                                                             │
│ Investigar reposição: Camiseta Azul M                       │  ← h3 Jakarta
│ CAM-AZ-M                                                    │  ← mono, tinta-500
│                                                             │
│ EVIDÊNCIA                                                   │
│ [Balcão] 9 procuraram e não tinha · 06–12/11 · 9 registros  │  ← SourceChip coral
│ [Estoque] Saldo 0 · atualizado há 18 h                      │  ← SourceChip turquesa
│                                                             │
│ ┃ São 9 atendimentos, não 9 compradores nem 9 vendas.       │  ← LimitationNote (borda âmbar)
│                                                             │
│ Sugestão: conferir estoque físico e consultar fornecedor.   │
│                                                             │
│ [ Criar ação ]  [ Ver detalhes ]               Descartar    │
└─────────────────────────────────────────────────────────────┘
  raio lg · sombra sm · borda esquerda 3 px na cor do status · hover eleva para md
```

### 5.4 Estados obrigatórios de todo componente

Padrão · hover · foco (anel violeta visível) · desabilitado · carregando (Skeleton com o mesmo formato) · vazio · erro (mensagem + tentar de novo).

---

## 6. Arquitetura do frontend

### 6.1 Organização por funcionalidade

```
frontend/
├── index.html
├── vite.config.ts               ← proxy /api → http://localhost:8000 em dev
├── orval.config.ts              ← gera src/api/gen a partir do OpenAPI
├── components.json              ← config do shadcn
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── router.tsx           ← rotas + guards por papel
│   │   ├── providers.tsx        ← QueryClient, Theme, Toaster
│   │   └── layouts/
│   │       ├── AppShell.tsx     ← sidebar + header + DemoRibbon
│   │       └── BalcaoShell.tsx  ← layout mínimo mobile do atendente
│   ├── styles/tokens.css
│   ├── api/
│   │   ├── client.ts            ← fetch com credentials + header CSRF
│   │   └── gen/                 ← gerado pelo Orval (não editar)
│   ├── components/
│   │   ├── ui/                  ← shadcn (Button, Card…)
│   │   └── midia/               ← domínio (OpportunityCard, KpiTile…)
│   ├── features/
│   │   ├── auth/                ← login, sessão, seleção de loja
│   │   ├── importacao/          ← páginas, hooks e componentes do fluxo
│   │   ├── publico/
│   │   ├── demanda/
│   │   ├── oportunidades/
│   │   └── acoes/
│   ├── lib/
│   │   ├── format.ts            ← moeda, datas, números pt-BR
│   │   └── permissions.ts
│   └── mocks/                   ← MSW: handlers + dados sintéticos
└── tests/
```

**Regra:** `features/*` pode importar de `components/` e `lib/`, mas uma feature **não importa** de outra. Componentes de domínio em `components/midia` não fazem fetch; recebem dados por props (facilita testes e prévia no design system).

### 6.2 Rotas e permissões

| Rota | Tela | Papéis |
| --- | --- | --- |
| `/login` | Login | público |
| `/lojas` | Escolher loja (se tiver mais de uma) | todos |
| `/` | Oportunidades (início) | gerente, dono |
| `/importar` | Importação e qualidade | gerente, dono |
| `/publico` | Meu público | gerente, dono |
| `/demanda` | Ranking de demanda + formulário | gerente, dono |
| `/balcao` | Formulário de demanda em tela cheia (mobile) | atendente (+ todos) |
| `/acoes` e `/acoes/:id` | Plano de ação | gerente, dono |

Atendente que faz login cai direto em `/balcao`. A autorização real continua no backend; o guard do frontend só organiza a navegação.

### 6.3 Estado

| Tipo | Onde fica |
| --- | --- |
| Dados do servidor | TanStack Query (chaves incluem `lojaId` para nunca misturar lojas no cache) |
| Sessão e loja atual | Contexto `AuthProvider`, carregado de `GET /api/me` |
| Filtros (período, unidade) | Query string da URL (compartilhável e sobrevive ao F5) |
| Formulários | React Hook Form |
| Tema claro/escuro | `localStorage` + classe `dark` |

Ao trocar de loja: `queryClient.clear()` e recarregar `/api/me`.

---

## 7. Telas e composição

| Tela | Composição principal | Detalhe de capricho |
| --- | --- | --- |
| **Login** | Card central + painel lateral com ilustração de ondas em violeta/coral | Botão "Entrar na demo" preenche usuário de teste |
| **Oportunidades** | Faixa de 3 `KpiTile` + até 3 `OpportunityCard` + `BlockedRuleRow` | Cartões entram em sequência (stagger de 60 ms); número do KPI faz contagem |
| **Importar** | `ImportStepper` + `DropzoneCsv` → prévia (Table) + `ReconciliationBar` + `RejectedRowsTable` | Barra de reconciliação muda de verde para âmbar conforme a diferença |
| **Meu público** | Seletor de período + `KpiTile` ×4 + `CategoryBars` + `HeatmapWeek` + `CoverageNote` | Alternar receita/unidades/pedidos sem recarregar |
| **Demanda (gerente)** | `DemandRanking` + filtro por motivo + atalho "Registrar" | Coral destaca o item mais procurado |
| **Balcão (atendente)** | `DemandQuickForm` em tela cheia: busca → `SizePicker` → `ReasonPicker` → registrar | Vibração curta + check animado ao registrar; funciona com uma mão |
| **Plano de ação** | Lista de `ActionCard` em colunas Aberta/Concluída/Descartada + `BeforeAfter` | Aviso fixo: "antes/depois mostra associação, não prova efeito" |

**Responsivo:** sidebar vira menu inferior no celular (Início, Demanda, Ações, Mais). Tabelas largas viram lista de cartões abaixo de 768 px.

---

## 8. Integração com o backend

### 8.1 Mudanças no `ARQUITETURA.md`

| Antes | Agora |
| --- | --- |
| Templates Django + HTMX | **React SPA** em `frontend/` |
| Views HTML no Django | Django serve **apenas `/api/*`** e `/admin` |
| Rotas HTML | Rotas do React Router |

O backend continua igual: Django Ninja, sessão, `request.loja`, serviços e motor.

### 8.2 Autenticação na SPA

Mesmo domínio para tudo (sem CORS):

```
https://midiacomercial.seudominio.com.br/        → arquivos do React (dist/)
https://midiacomercial.seudominio.com.br/api/*   → Django
https://midiacomercial.seudominio.com.br/admin/* → Django
```

1. A SPA chama `GET /api/csrf` (o Django define o cookie `csrftoken`).
2. `POST /api/auth/login` com usuário e senha → cookie de sessão `HttpOnly`.
3. Toda requisição usa `credentials: "include"` e envia `X-CSRFToken` nos métodos que alteram dados.
4. `GET /api/me` devolve usuário, papel e loja atual.

```ts
// src/api/client.ts
function getCookie(nome: string) {
  return document.cookie.split("; ").find((c) => c.startsWith(nome + "="))?.split("=")[1];
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const metodo = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD"].includes(metodo)) headers.set("X-CSRFToken", getCookie("csrftoken") ?? "");
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(url, { ...init, headers, credentials: "include" });
  if (res.status === 401) window.location.assign("/login");
  if (!res.ok) throw await res.json(); // { detail, erros? } padronizado no backend
  return res.json() as Promise<T>;
}
```

Endpoints novos no backend: `GET /api/csrf`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`, `POST /api/me/loja`.

### 8.3 Contrato tipado com Orval

```ts
// orval.config.ts
export default {
  midiacomercial: {
    input: "http://localhost:8000/api/openapi.json",
    output: { target: "src/api/gen/index.ts", client: "react-query", mode: "tags-split",
              override: { mutator: { path: "src/api/client.ts", name: "api" } } },
  },
};
```

`npm run api:gen` sempre que o backend mudar um schema. Os tipos quebram na compilação se o contrato mudar.

### 8.4 Deploy na Hostinger

Build do React no Dockerfile (estágio Node) e arquivos servidos pelo **Caddy**:

```
midiacomercial.seudominio.com.br {
    handle /api/*    { reverse_proxy web:8000 }
    handle /admin/*  { reverse_proxy web:8000 }
    handle /static/* { reverse_proxy web:8000 }
    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }
}
```

---

## 9. Plano de construção

### 9.1 Quem faz o quê no frontend

| Pessoa | Responsabilidade |
| --- | --- |
| **Frontend** (principal) | Setup, tokens, AppShell, componentes de domínio, telas Oportunidades e Meu público |
| **Produto e UX** | Microcopy, ícones, Balcão, estados vazios, revisão visual, roteiro da demo |
| **Backend** | Endpoints de auth/me, OpenAPI estável, Caddy servindo a SPA |
| **Dados** | Formato das respostas de métricas e oportunidades; dados mockados do MSW iguais ao seed |

### 9.2 Linha do tempo (encaixada nas 48 h do `ARQUITETURA.md`)

| Janela | Entregas do frontend | Marco |
| --- | --- | --- |
| **H0–H4** | Vite + TS + Tailwind v4 + shadcn; `tokens.css`; fontes; AppShell com sidebar e tema; MSW ligado | App abre com layout e tema Mídia UI |
| **H4–H12** | Componentes de domínio com dados mockados: `KpiTile`, `SignalBadge`, `SourceChip`, `OpportunityCard`, `LimitationNote`, `DemandQuickForm` | Página `/` bonita com dados falsos |
| **H12–H24** | Telas Balcão, Meu público (gráficos) e Importar (stepper + prévia) | 4 de 6 telas navegáveis no mock |
| **H24–H32** | Orval + troca do MSW pela API real; login; Plano de ação | Fluxo completo ligado ao backend |
| **H32–H38** | Estados vazios/erro/carregando, responsivo, modo escuro, acessibilidade | Teste interno no celular |
| **H38–H44** | Animações finais, DemoRibbon, ajuste de textos, screenshots para o pitch | Ensaio |
| **H44–H48** | Congelar; build de produção no VPS; MSW como plano B offline | Entrega |

### 9.3 Ordem de construção dos componentes

```
tokens → Button/Card/Badge → SignalBadge, SourceChip → KpiTile → LimitationNote
→ EvidenceList → OpportunityCard → DemandQuickForm → gráficos → Importação → ActionCard
```

### 9.4 Plano de corte

1. Cortar modo escuro (manter tokens prontos).
2. Cortar animações (manter só transições de hover).
3. Cortar heatmap; manter barras por categoria.
4. Mínimo: Login → Oportunidades → Criar ação, e Balcão.

---

## 10. Qualidade, acessibilidade e definição de pronto

### Acessibilidade (WCAG 2.1 AA)

- Contraste ≥ 4,5:1 para texto (por isso textos coloridos usam as variações `-700`).
- Status com ícone + texto, não só cor.
- Foco sempre visível (anel violeta); navegação completa por teclado.
- `aria-live="polite"` ao confirmar registro no Balcão e ao terminar a importação.
- Gráficos com tabela alternativa ("ver dados") para leitor de tela.

### Definição de pronto do frontend

- [ ] Tokens aplicados; nenhuma cor escrita direto no componente
- [ ] 6 telas navegáveis, com estados de carregando, vazio e erro
- [ ] Balcão registra demanda em ≤ 4 toques e ≤ 20 s no celular
- [ ] Toda oportunidade mostra evidência, amostra, status e limitação
- [ ] Troca de loja limpa o cache e não mostra dado da outra loja
- [ ] Funciona no celular (375 px) e no desktop (1440 px)
- [ ] Build de produção servido pelo Caddy no VPS
- [ ] Selo "DADOS DE DEMONSTRAÇÃO" visível em todas as telas

---

## 11. Fontes

Consultadas em 13/11/2026.

- shadcn/ui: Tailwind v4 e React 19. https://ui.shadcn.com/docs/tailwind-v4
- AdminLTE: 27 Best React Dashboard Templates 2026 (Shadcn Admin como melhor opção gratuita com stack moderna). https://adminlte.io/blog/react-dashboards/
- AdminLTE: 28 Best Free Shadcn Admin Dashboard Templates 2026. https://adminlte.io/blog/shadcn-admin-dashboard-templates/
- Untitled UI: 16 Best React Dashboards in 2026. https://www.untitledui.com/blog/react-dashboards
- Tremor: componentes de dashboard (Tailwind + Radix). https://docsearch.algolia.com/mcp/docs/repo/tremorlabs/tremor
- AdminLTE: Best Tremor Dashboard Templates & Components 2026. https://adminlte.io/blog/tremor-dashboard-templates/
- Shadcnblocks: blocos de dashboard e gráficos. https://www.shadcnblocks.com/blocks/dashboard
- ReUI: blocos de dashboard. https://reui.io/blocks/application/dashboard
- Creative Tim: blocos de admin sobre shadcn (gráficos via Recharts). https://www.creative-tim.com/ui/blocks/application-admin
- SaaSUI: Best SaaS Dashboard UI Inspiration Sites 2026. https://www.saasui.design/best-saas-dashboard-ui-inspiration
- SaaSFrame: comparação de bibliotecas de inspiração. https://www.saasframe.io/compare
