# 08. Design: geometria reta, efeitos React Bits e telas mais intuitivas

**Projeto:** MidiaComercial · **Data:** 13/11/2026 · **Status:** implementado na v0.3 (13/11/2026). Ver §12 para o que mudou em relação a esta proposta.
**Complementa:** [`FRONTEND.md`](../FRONTEND.md) §4 (Mídia UI) e [07](07-EVOLUCAO-AGENTE-PUBLICO.md) (telas do agente e de clientes)
**Escopo:** só o frontend (`frontend/src`). Backend, API e regras de negócio não mudam.

---

## Sumário

1. [Objetivo](#1-objetivo)
2. [Princípios](#2-princípios)
3. [Geometria: menos arredondado, mais quadrado](#3-geometria-menos-arredondado-mais-quadrado)
4. [React Bits: o que é e como entra no projeto](#4-react-bits-o-que-é-e-como-entra-no-projeto)
5. [Catálogo: efeito × lugar × motivo](#5-catálogo-efeito--lugar--motivo)
6. [Plano por tela (intuitividade)](#6-plano-por-tela-intuitividade)
7. [Responsividade](#7-responsividade)
8. [Acessibilidade e desempenho](#8-acessibilidade-e-desempenho)
9. [Plano de execução](#9-plano-de-execução)
10. [Definição de pronto](#10-definição-de-pronto)
11. [Fontes de templates e referências](#11-fontes-de-templates-e-referências)

---

## 1. Objetivo

| Problema hoje | Meta |
| --- | --- |
| Visual arredondado e genérico (cantos de 10 a 20 px, chips em pílula) | Identidade **reta e técnica**, de painel de dados: cantos de 2 a 6 px, grade visível |
| Telas mostram números, mas não dizem **o que fazer** com eles | Cada tela abre com um destaque ("o que mudou") e uma ação principal clara |
| Animação só na contagem dos KPIs | Efeitos pontuais do **React Bits** que **explicam** o estado (chegou dado, agente pensando, registrado) |
| No celular, barras de categoria e heatmap ficam apertados; no tema escuro o heatmap mostra células quase brancas | Layout específico para 375 px e escala de cor que funciona nos dois temas |

**O que não muda:** paleta violeta/coral/tinta, fontes (Plus Jakarta Sans, Inter, JetBrains Mono), linguagem de loja e a regra "toda informação mostra a limitação".

---

## 2. Princípios

1. **Efeito com função.** Cada efeito responde a uma pergunta do usuário: *chegou?*, *está pensando?*, *deu certo?*, *onde clico?*. Efeito decorativo sem função não entra.
2. **Um efeito de destaque por tela.** Os demais são discretos (hover e entrada). Painel de loja não é landing page.
3. **Reta por padrão, redonda por exceção.** Só são redondos o que é naturalmente circular: avatar, ponto de status, indicador "ao vivo", botão de microfone.
4. **Movimento respeita o usuário.** Com `prefers-reduced-motion`, todo efeito vira estado final estático, sem exceção.
5. **Só tokens.** Os componentes do React Bits vêm com cores hex fixas. Ao copiar, troque todas por tokens (`var(--color-violeta-500)`, `--chart-1` etc.). Nenhum hex solto em componente (regra do `FRONTEND.md`).
6. **Leve.** Não usar efeitos WebGL (Three.js, OGL) nem efeitos de cursor. Orçamento: no máximo **+25 kB gzip** no bundle inicial.

---

## 3. Geometria: menos arredondado, mais quadrado

### 3.1 Tokens (mudança central)

No Tailwind v4, `rounded-sm`, `rounded-md`, `rounded-lg` e `rounded-xl` leem `--radius-*` do `@theme`. Hoje o código usa `rounded-md` 57 vezes, `rounded-lg` 16, `rounded-sm` 11 e `rounded-xl` 1. **Basta mudar os tokens para o site inteiro ficar mais reto**, sem editar componente por componente.

`frontend/src/styles/tokens.css`:

```css
@theme {
  /* antes: 6 / 10 / 14 / 20 */
  --radius-sm: 2px;   /* chips, badges, células do heatmap, barras */
  --radius-md: 4px;   /* botões, inputs, segmentados, itens de menu */
  --radius-lg: 6px;   /* cards, diálogos, painéis */
  --radius-xl: 8px;   /* folha inferior (bottom sheet) no celular */

  /* sombra "dura", deslocada, combina com cantos retos */
  --shadow-xs: 0 1px 0 rgb(18 25 51 / 0.06);
  --shadow-sm: 0 1px 0 rgb(18 25 51 / 0.08), 0 0 0 1px rgb(18 25 51 / 0.02);
  --shadow-md: 4px 4px 0 -1px rgb(18 25 51 / 0.10);
  --shadow-bloco: 3px 3px 0 0 var(--color-violeta-500); /* destaque de card ativo */
}

@layer base {
  /* foco também reto */
  :focus-visible { border-radius: var(--radius-sm); }
}
```

### 3.2 Exceções que precisam de edição manual

| Onde | Hoje | Depois |
| --- | --- | --- |
| `Badge`, `SourceChip` e chips de filtro (`rounded-full`) | Pílula | `rounded-sm` com borda de 1 px (`border border-current/15`), estilo etiqueta |
| `Segmentado` em `PublicoPage` (`rounded-[8px]`) | 8 px fixo | `rounded-sm` (os 2 valores fixos `rounded-[8px]` saem) |
| Barras de progresso e de categoria | `rounded-sm` | `rounded-none`: barra reta lê melhor como medida |
| Avatar, ponto "ao vivo", botão Falar, toggle de tema | `rounded-full` | **Mantém** (exceção do princípio 3) |
| `DemoRibbon`, `StoreSwitcher` | variados | `rounded-md` (4 px) |

Verificação: `grep -rn "rounded-full\|rounded-\[" frontend/src` deve sobrar só nas exceções da última linha.

### 3.3 Linguagem visual de "grade"

Cantos retos pedem estrutura visível:

- **Cards com régua no topo:** em vez da faixa colorida de 4 px arredondada, usar uma linha de 2 px reta e um rótulo `overline` encostado à esquerda (como etiqueta de prancheta).
- **Divisórias em vez de espaço:** grupos de KPI dentro de um único bloco com divisórias de 1 px (`divide-x divide-border`) em telas grandes. Fica mais "painel" e economiza espaço.
- **Fundo em grade sutil** (efeito *Squares*, §5) só no login e nos estados vazios.
- **Card ativo/selecionado:** `shadow-bloco` (sombra violeta deslocada), em vez de anel com blur.

---

## 4. React Bits: o que é e como entra no projeto

**React Bits** (reactbits.dev, código no GitHub `DavidHDev/react-bits`, licença MIT + Commons Clause: uso livre em produto, proibido revender os componentes) é uma coleção de componentes animados para **copiar para dentro do repositório**, no mesmo modelo do shadcn/ui. Cada componente tem variantes **JS/TS** × **CSS/Tailwind**.

**Variante do projeto: sempre `TS + Tailwind`.**

### 4.1 Instalação

Pela CLI do shadcn, que já é o padrão do projeto. O formato do endereço aparece no botão "CLI" de cada componente no site. **Confira lá antes de rodar**, porque o padrão pode mudar entre versões:

```bash
cd frontend
npx shadcn@latest add https://reactbits.dev/r/SpotlightCard-TS-TW
```

Ou copie à mão pela aba "Code" do site. As duas formas levam ao mesmo lugar.

### 4.2 Onde ficam

```
frontend/src/components/efeitos/      ← tudo que vem do React Bits
  SpotlightCard.tsx
  AnimatedList.tsx
  ShinyText.tsx
  ...
  index.ts                            ← reexporta; features importam daqui
```

Regras:

- `components/efeitos/` **não conhece domínio**: só recebe `children` e props visuais.
- `components/midia/*` usa os efeitos. As features **não** importam efeito direto, para a troca ficar num lugar só.
- Ao copiar: (1) troque os hex por tokens; (2) troque `border-radius` grande por `var(--radius-*)`; (3) adicione o desligamento por *reduced motion* (§8); (4) registre a origem no topo do arquivo: `// Fonte: React Bits <Nome> (MIT + Commons Clause), adaptado aos tokens Mídia UI`.

### 4.3 Dependências

Parte dos componentes usa **`motion`** (já prevista no `FRONTEND.md` §2, ainda não instalada) e outros usam **`gsap`**.

| Dependência | Decisão |
| --- | --- |
| `motion` | **Instalar** (`npm i motion`). Usada por AnimatedList, BlurText e Stepper |
| `gsap` | **Não instalar.** Se um componente escolhido exigir gsap, use a versão sem gsap ou reescreva com `motion` ou CSS |
| `three`, `ogl`, `@react-three/*` | **Proibido** (peso e consumo de bateria no celular do balcão) |

> Os nomes dos componentes abaixo são do catálogo atual do React Bits. Antes de instalar, confirme no site o nome e se a dependência continua a mesma.

---

## 5. Catálogo: efeito × lugar × motivo

### 5.1 Adotar

| Efeito (React Bits) | Onde | Por que (função) | Dep. |
| --- | --- | --- | --- |
| **SpotlightCard** | `KpiTile`, `OpportunityCard`, cards de campanha do agente | Luz segue o cursor e indica "isso é clicável/explorável". Spotlight em violeta 12% de opacidade. Desligado no toque (celular) | — |
| **CountUp** | `KpiTile` (substitui `useContagem`) e medição das campanhas | Número "chegando" sinaliza dado novo ao trocar período/loja. Manter `tabular` | motion |
| **AnimatedList** | Propostas pendentes do agente, histórico do balcão, linhas rejeitadas na importação | Itens novos entram por cima; o usuário vê **o que acabou de chegar**. Combina com `aria-live="polite"` | motion |
| **ShinyText** | Estado "Agente pensando…" e "Processando planilha…" | Indica processamento sem spinner genérico. Texto continua legível | — |
| **StarBorder** | **Uma** ação principal por tela: "Buscar clientes para produtos em baixa" (Agente) e "Importar CSV" (vazio de Oportunidades) | Dirige o olho para o próximo passo. Usar com raio de 4 px | — |
| **ClickSpark** | Botão "Registrar" do balcão e "Confirmar" das propostas | Confirmação tátil instantânea de que **gravou**. Cor coral no balcão e violeta no agente | — |
| **Squares** (fundo de grade) | Login, `EmptyState`, tela "Escolher loja" | Reforça a geometria quadrada e a ideia de "sinal" sem pesar. Velocidade baixa e opacidade ≤ 8% | — |
| **FadeContent** / **AnimatedContent** | Entrada dos cards de gráfico em Meu público e Oportunidades | Substitui `animate-entrar` por entrada ao rolar a página; só a primeira vez | ver site |
| **Stepper** | Importar dados: Arquivo → Conferir colunas → Resultado | Mostra em que etapa a pessoa está, o que deixa o fluxo mais intuitivo | motion |
| **BlurText** | Só o título do login ("Seus sinais de venda, em uma só mídia.") | Única animação de texto do produto; fica fora do painel | motion |

### 5.2 Não adotar (e por quê)

| Efeito | Motivo |
| --- | --- |
| Aurora, Silk, Galaxy, Threads, Iridescence, Liquid Chrome (fundos WebGL) | Peso, bateria e distração num painel de trabalho |
| Splash Cursor, Target Cursor, Blob Cursor, Ghost Cursor | Atrapalham a leitura de dados; não funcionam no toque |
| SplitText, ScrollReveal com gsap | Dependência extra; o BlurText cobre o único caso |
| DecryptedText, GlitchText | Passam a sensação de "dado instável", o oposto do princípio "evidência" |
| Dock (menu estilo macOS) | Ícones que crescem pioram o alvo de toque; o menu inferior atual é melhor |
| TiltedCard, Magnet | Movimento que não informa nada |

---

## 6. Plano por tela (intuitividade)

Padrão novo para **todas** as telas, aplicado no `PageHeader`:

```
┌───────────────────────────────────────────────────────────────┐
│ Meu público                                   [7d][30d][90d]  │
│ Quem compra, o quê e quando.                                  │
│ ▸ Destaque: Calças lideram (41%) · pico sáb 9h · melhor dia 07/11 │  ← nova linha
└───────────────────────────────────────────────────────────────┘
```

- **Linha de destaque** (prop nova `destaque` no `PageHeader`): uma frase calculada no cliente, a partir de dados já carregados, que responde "o que mudou?".
- **Ação principal** sempre à direita no desktop e **fixa embaixo** no celular (acima do menu inferior).

| Tela | Melhorias |
| --- | --- |
| **AppShell** | Item ativo do menu com barra reta de 3 px à esquerda (em vez de fundo arredondado); grupos rotulados "Analisar" (Oportunidades, Meu público, Procuraram e não tinha), "Agir" (Plano de ação, Agente, Clientes) e "Dados" (Importar, Balcão). Menu inferior no celular: Início · Agente · Demanda · Ações · Mais |
| **Oportunidades** | Até 3 cartões com SpotlightCard; numeração "1 de 3" grande e reta no canto (prioridade visível); estado vazio com Squares + StarBorder em "Importar CSV" |
| **Importar dados** | Stepper de 3 etapas; linhas rejeitadas em AnimatedList com o motivo ao lado; ShinyText durante o processamento |
| **Meu público** | (a) Linha de destaque. (b) KPIs com SpotlightCard + CountUp; no desktop num bloco único com divisórias. (c) **Heatmap:** escala por transparência do violeta (`color-mix(in oklab, var(--color-violeta-500) 18%/40%/70%/100%, transparent)`) para funcionar nos dois temas, já que hoje a célula fraca fica branca no escuro; células retas. (d) **Barras de categoria:** valor e % sempre na mesma linha (`whitespace-nowrap`), barra reta; no celular, nome + valor em cima e barra embaixo, largura total. (e) Recorrência: "Amostra limitada" continua visível no card |
| **Procuraram e não tinha** | Ranking com barra coral reta; filtro de motivo em chips retangulares; destaque "produto mais procurado sem estoque" |
| **Plano de ação** | Colunas por situação com contador; card ativo com `shadow-bloco`; ClickSpark em "Concluir" |
| **Balcão** | Mantém ≤ 4 toques e alvos de 44/56 px; ClickSpark + check animado ao registrar; histórico do dia em AnimatedList |
| **Agente** | Conversa: mensagens em blocos retos (sem bolha redonda), "Agente pensando…" em ShinyText, botão Falar redondo (exceção). Propostas em AnimatedList, com o **campo incerto destacado em coral com borda tracejada** e Confirmar com ClickSpark. Campanhas com SpotlightCard; "Buscar clientes" com StarBorder; medição (propostas → aprovadas → enviadas → convertidos) em funil horizontal com CountUp |
| **Clientes** | Tabela densa com cabeçalho fixo; no celular vira lista de cards; selo "em descanso" retangular |
| **Login / Escolher loja** | Fundo Squares, título com BlurText, card de login com raio de 6 px |

---

## 7. Responsividade

Breakpoints do Tailwind (já em uso): `sm` 640 · `md` 768 · `lg` 1024 (sidebar aparece) · `xl` 1280.

| Componente | < 640 px | 640–1023 px | ≥ 1024 px |
| --- | --- | --- | --- |
| KPIs | 1 coluna; número em `text-h1` (30 px) | 2 colunas | 4 colunas em bloco com divisórias; `text-display` |
| Seletor de período/unidade | Largura total, botões `flex-1`, altura 44 px | Auto | Auto |
| Gráficos | 1 coluna; heatmap com rolagem horizontal e coluna do dia fixa (`sticky left-0`) | 1 coluna | 2 colunas (`xl`) |
| Barras de categoria | 2 linhas (nome + valor / barra) | 3 colunas | 3 colunas |
| Agente | Abas Conversa · Propostas · Campanhas | Abas | Conversa à esquerda, propostas à direita |
| Ação principal | Barra fixa no rodapé, acima do menu inferior | No cabeçalho | No cabeçalho |
| SpotlightCard / ClickSpark | Spotlight **desligado** (sem hover no toque); ClickSpark ativo | Igual | Ambos ativos |

Conferir em **375, 768, 1280 e 1536 px**, temas claro e escuro.

---

## 8. Acessibilidade e desempenho

### 8.1 Desligar movimento

Hook único usado por todos os efeitos de `components/efeitos/`:

```ts
// frontend/src/lib/movimento.ts
import { useSyncExternalStore } from "react";

const q = "(prefers-reduced-motion: reduce)";
const assinar = (cb: () => void) => {
  const m = window.matchMedia(q);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export const useMenosMovimento = () =>
  useSyncExternalStore(assinar, () => window.matchMedia(q).matches, () => false);
```

Com `useMenosMovimento() === true`: CountUp mostra o valor final, AnimatedList renderiza lista simples, e Squares, ShinyText, StarBorder, ClickSpark e SpotlightCard ficam sem animação.

### 8.2 Regras

- Efeito nunca carrega informação sozinho: o texto e o `aria-live` continuam iguais.
- Canvas (Squares, ClickSpark) com `aria-hidden` e `pointer-events-none`; pausar quando a aba está oculta (`document.visibilityState`).
- Contraste AA mantido: ShinyText só sobre texto `muted-foreground` ou mais forte.
- Efeitos entram no chunk da página (as rotas já são `lazy`), não no bundle inicial; exceção: o login.
- Orçamento: **+25 kB gzip** no total; medir com `npm run build` antes e depois.

---

## 9. Plano de execução

> **Atenção:** em 13/11/2026 havia outra sessão alterando `frontend/src` (agente, clientes, Meu público). Execute cada fase com a árvore parada e sem outra pessoa ou sessão editando os mesmos arquivos.

| Fase | Entrega | Arquivos principais | Risco |
| --- | --- | --- | --- |
| **1. Geometria** | Tokens de raio e sombra (§3.1) + exceções (§3.2) | `styles/tokens.css`, `components/ui/badge.tsx`, `components/midia/sinais.tsx`, `features/publico/PublicoPage.tsx` | Baixo: visual global, sem lógica |
| **2. Base de efeitos** | `npm i motion`, `lib/movimento.ts`, pasta `components/efeitos/` com SpotlightCard, CountUp, ShinyText, ClickSpark, Squares | `package.json`, `components/efeitos/*` | Baixo |
| **3. Meu público** | Linha de destaque, heatmap nos dois temas, barras responsivas, KPIs com efeitos | `PublicoPage.tsx`, `graficos.tsx`, `KpiTile.tsx`, `estado.tsx` | Médio: `KpiTile` também é usado em Oportunidades |
| **4. Agente** | AnimatedList, ShinyText, StarBorder, ClickSpark, abas no celular | `features/agente/*`, `components/midia/agente.tsx` | Médio |
| **5. Demais telas** | Shell com grupos, Oportunidades, Importar (Stepper), Balcão, Clientes, Login | `AppShell.tsx`, demais `features/*` | Médio |
| **6. Polimento** | Revisão em 375/768/1280/1536, claro/escuro, reduced motion, orçamento de bundle | — | — |

Validação ao fim de cada fase:

```bash
cd frontend && npm run typecheck && npm test && npm run build
```

---

## 10. Definição de pronto

- [ ] `grep -rn "rounded-full\|rounded-\[" frontend/src` mostra só as exceções do §3.2.
- [ ] Nenhum hex novo em `components/efeitos/` (`grep -rn "#[0-9a-fA-F]\{3,6\}" frontend/src/components/efeitos` vazio).
- [ ] Toda tela tem linha de destaque **ou** ação principal visível sem rolar a página.
- [ ] Heatmap legível no tema escuro (sem célula branca).
- [ ] Barras de categoria sem quebra de linha irregular em 375 px.
- [ ] Com *reduced motion* ligado no sistema, nenhuma animação roda.
- [ ] Bundle inicial cresceu no máximo 25 kB gzip.
- [ ] `typecheck`, `test` e `build` verdes.

---

## 11. Fontes de templates e referências

| Uso | Fonte |
| --- | --- |
| Efeitos e animações | **React Bits**: reactbits.dev (GitHub `DavidHDev/react-bits`) |
| Componentes base (já usados) | **shadcn/ui**: ui.shadcn.com (Blocks e Charts) |
| Layout de dashboard Vite + shadcn | **Shadcn Admin**: github.com/satnaing/shadcn-admin |
| KPI, listas em barra e trackers | **Tremor**: tremor.so |
| Blocos de dashboard e gráficos | **shadcnblocks.com**, **reui.io**, **originui.com** |
| Telas de chat/agente | **assistant-ui.com**, **Vercel AI Elements** (ai-sdk.dev/elements), **prompt-kit.com** |
| Acabamento visual | **Untitled UI React** |
| Padrões de produto real | **Mobbin**, **SaaSFrame**, **Refero** |
| Estética | **Dribbble**, **Land-book** |

Regra mantida do `FRONTEND.md` §3.2: padrão de uso vem de produto real; estética, de galeria; nada é copiado pixel a pixel.

---

## 12. Registro da implementação (v0.3)

| Item | Como ficou |
| --- | --- |
| Geometria | Tokens 2/4/6/8 px e sombra "dura"; `rounded-full` só em avatar, ponto ao vivo e microfone; barras retas |
| Efeitos | `components/efeitos/` com SpotlightCard, CountUp, ShinyText, ClickSpark, Squares, StarBorder, AnimatedList, BlurText, FadeContent |
| Origem do código | **Reimplementações enxutas inspiradas** no React Bits, não cópias. Motivo: as versões atuais do registro trazem paletas com hex fixo (§2.5), o FadeContent usa **gsap** (§4.3), AnimatedList e Stepper dependem de **@hugeicons** e o conjunto soma cerca de 4.500 linhas (§2.6). Cada arquivo registra a origem |
| Ponte para as telas | `components/midia/destaques.tsx` (Processando, AcaoPrincipal, CartaoExploravel, FundoGrade, TituloAnimado, Confirmacao, Entrada) e `lista-ao-vivo.tsx` (ListaAoVivo). Features não importam efeito direto |
| `motion` | Instalado e usado só no AnimatedList, em módulo separado: fica fora do bundle inicial |
| Orçamento | Bundle inicial (index + modulepreload): 191.516 → 191.541 bytes gzip (**+25 bytes**) |
| Telas | PageHeader com linha de destaque; KPIs em bloco com divisórias; heatmap por transparência (sem célula branca no escuro); barras em 2 linhas no celular; menu em grupos Analisar/Agir/Dados com barra de 3 px; menu inferior com 5 itens; agente com abas no celular e funil com CountUp; Clientes em tabela densa no desktop; login e escolha de loja com grade e BlurText |
| Correção encontrada | A classe `overline` colidia com a utilidade nativa do Tailwind (`text-decoration: overline`) e desenhava um traço sobre os rótulos. Renomeada para `sobretitulo` |
| Não feito | Stepper de 3 etapas novo na importação: o `ImportStepper` atual (Arquivo → Prévia → Confirmar) foi mantido com geometria reta |
| Verificação | Screenshots logado em 1280 e 375 px, claro e escuro; 12 testes de frontend (incluindo *reduced motion*) |
