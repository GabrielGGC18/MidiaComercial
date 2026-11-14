# 18 · Mídia UI 2: design system

**Data:** 13/11/2026 · **Código:** `frontend/src/styles/tokens.css` · **Substitui:** a "geometria reta" do [docs/08 §3.1](08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md) e a regra "proibido GSAP" · **Continua valendo:** [FRONTEND.md](../FRONTEND.md) (componentes, rotas, voz) e os princípios de produto (evidência, limitação visível, uma pessoa confirma)

## 1. Por que refazer

O site tinha duas linguagens: o painel com cantos de 2 a 8 px e sombra dura, e a página inicial nova com painéis de 28 px e luz suave. Havia também problemas de sobreposição (a barra do site ficava por cima do palco em tela cheia; a pílula do menu cobria o nome da marca) e tons faltando na paleta.

O Mídia UI 2 é **um sistema só**, trocado nos tokens. O painel logado herdou os raios e as sombras novas sem mexer em cada tela.

**Referências** (composição e ritmo; nada copiado):
- Dribbble "Maritime Fusion Reactor";
- pibaru.com;
- helenacrm.com;
- React Bits.

Detalhes no [docs/17 §7](17-DESIGN-DA-APRESENTACAO.md).

## 2. Cor

| Família | Tons | Uso |
| --- | --- | --- |
| **Violeta** | 50 · 100 · 200 · 300 · 400 · 500 · 600 · 700 · 800 · 900 | Ação, seleção, marca. `500` é a primária; `300` é a ênfase sobre escuro |
| **Coral** | 100 · 300 · 500 · 600 · 700 | Só "o sinal que acabou de chegar" (procura sem estoque, dado novo). Nunca decoração solta |
| **Tinta** | 50 · 100 · 200 · 300 · 400 · 500 · 600 · 700 · 800 · 900 · 950 | Neutros e superfícies |
| **Noite** | `#04060d` | Topo dos painéis escuros |
| **Sinais** | ok · atenção · bloqueado · erro · info (cor, fundo e texto) | Status, sempre com ícone e rótulo |

Novos nesta versão: violeta 200, 400 e 800; coral 300 e 600; tinta 400 e 600; noite.

**Superfícies de painel** (classes):
- `painel-noite`: noite → violeta → luz;
- `painel-secao`: segue o tema;
- `painel-estrias` e `painel-raios`: cartões de destaque;
- `brilho-sinal`: brilho coral.

**Regra de tom sobre escuro:**
- texto principal branco;
- texto secundário `tinta-300`;
- ênfase `violeta-300`.

Em painel escuro fixo, use cores explícitas e não a classe `dark`: ela liga as variantes `dark:` mas não troca as variáveis.

## 3. Forma e elevação

| Token | Valor | Uso |
| --- | --- | --- |
| `rounded-sm` | 6 px | Etiqueta, chip, anel de foco |
| `rounded-md` | 10 px | Botão, campo |
| `rounded-lg` | 14 px | Cartão |
| `rounded-xl` | 16 px | Cartão grande, diálogo |
| `rounded-2xl` | 20 px | Cartão de destaque, barra de navegação |
| `rounded-3xl` / `painel` | 28 px | Painel de seção |

| Sombra | Uso |
| --- | --- |
| `shadow-xs` / `shadow-sm` | Cartão em repouso |
| `shadow-md` | Cartão em destaque, menu |
| `shadow-lg` | Palco, diálogo |
| `shadow-bloco` | Anel violeta com brilho: a única ação principal da tela |

## 4. Tipografia

- **Famílias:**
  - Plus Jakarta Sans para títulos e números;
  - Inter para texto;
  - JetBrains Mono para códigos e rotas.
- **Títulos fluidos:** use estas classes, sem `clamp()` repetido na tela. Todos têm peso 700, espaçamento apertado e `text-wrap: balance`.

| Classe | Tamanho |
| --- | --- |
| `titulo-hero` | 34 a 68 px |
| `titulo-secao` | 28 a 48 px |
| `titulo-cartao` | 22 a 35 px |

- **Texto:**
  - 16 px na conversa e na leitura longa;
  - 14 px na interface;
  - 11 a 12 px só em metadado.
- **Números:** `tabular`.

## 5. Layout e responsividade

- **Largura:** `conteudo` (1280 px no máximo). **Respiro de seção:** `secao-pad`.
- **Pontos de quebra:** `xs` 400 · `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. O mínimo suportado é **320 px**.
- **Conferir sempre em 320, 375, 768, 1024 e 1440 px,** nos temas claro e escuro.
- **Regras:**
  - filho de `flex` ou `grid` com texto leva `min-w-0`;
  - o que não pode quebrar leva `whitespace-nowrap`, e o vizinho é que encolhe;
  - abaixo de `lg`, a navegação vira botão de menu;
  - abaixo de `sm`, ações secundárias entram no menu, e não na barra;
  - no celular, conversa e resultado ficam numa coluna só, sem abas que escondam conteúdo;
  - nenhum painel tem rolagem interna, exceto código e tabela.

## 6. Camadas (fim da sobreposição)

Use só os nomes. É proibido `z-50` ou `z-[número]` solto.

| Classe | z | O que fica nela |
| --- | --- | --- |
| `z-conteudo` | 10 | Cabeçalho de tabela preso, botão sobre o cartão |
| `z-barra` | 20 | Cabeçalho preso dentro do conteúdo |
| `z-fixo` | 30 | Sidebar, barra inferior, botão flutuante |
| `z-nav` | 40 | Barra de navegação pública, faixa de demonstração |
| `z-sobre` | 50 | Fundo de sobreposição, menus suspensos |
| `z-dialogo` | 60 | Diálogo, gaveta, palco em tela cheia |
| `z-aviso` | 70 | Toast, link "pular para o conteúdo" |

Outras garantias:
- **Âncoras:** `scroll-padding-top` global, calculado por `--altura-nav`, impede que um título pare embaixo da barra.
- **Decoração absoluta:** `pointer-events-none` e `-z-10` dentro de um pai `isolate`.
- **Barras fixas no celular:** `seguro-topo` e `seguro-base` (entalhe e barra de gestos).
- **Texto longo:** quebra a palavra em vez de estourar a tela; imagem, SVG e canvas nunca passam de 100% da largura.

## 7. Movimento

| Ferramenta | Quando |
| --- | --- |
| **GSAP + ScrollTrigger** (`components/efeitos/MovimentoLanding.tsx`) | Coreografia da abertura, painéis que assentam ao rolar, parallax e contagem de números. Carregado sob demanda |
| **CSS + `Revelar` / `TituloSubindo`** | Entrada por rolagem: escada, grupo, recorte, marca-texto, título por palavra |
| **Motion** | Palco da demonstração, listas, transição de slides |
| **React Bits** (reimplementado enxuto) | Fundos e microefeitos, como o Aero Shards |

**Regras:**
- um motor por elemento;
- animação contínua só com `transform` e `opacity`;
- pausa fora da tela;
- com "menos movimento", tudo aparece no estado final;
- no painel logado, o movimento é discreto (150 a 300 ms).

As skills oficiais do GSAP estão em `.claude/skills/gsap-*` (licença MIT, GreenSock). O agent `frontend-react` as consulta antes de animar.

## 8. Modo apresentação

`/apresentar` mostra os capítulos da página inicial como slides de tela cheia.
- **Navegar:** ← →, espaço e os segmentos da barra de progresso.
- **Teclas:** F (tela cheia), N (notas do apresentador), Esc (sair).
- **Encaixe:** cada slide é escalado para caber na altura da tela.
- **Link direto:** `?slide=3` abre direto no slide.

## 9. Pendências

| Prioridade | Item |
| --- | --- |
| P1 | Revisar tela a tela do painel logado (oportunidades, importação, agente, balcão) com os raios e as sombras novas, nas 5 larguras |
| P1 | Trocar os `clamp()` e `max-w-[1280px]` restantes pelos utilitários |
| P2 | Página viva de componentes (catálogo) para a equipe |
