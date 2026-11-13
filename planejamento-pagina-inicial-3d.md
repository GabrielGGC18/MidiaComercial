# Planejamento: página inicial com 3D, animação e introdução ao sistema

**Projeto:** MidiaComercial · **Data:** 13/11/2026 · **Status:** só planejamento, nada implementado
**Base:** login atual (coluna centralizada + `Institucional`, já entregue) e regras do [docs/08](docs/08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md)
**Complementa:** [`planejamento.md`](planejamento.md) (Fase 1 do login já feita)

---

## 1. Objetivo

Fazer o lojista do shopping entender **em até 30 segundos, antes de entrar**, para que o sistema serve, e mostrar o caminho na primeira vez que ele entra.

| Hoje | Meta |
| --- | --- |
| Título animado, frase em rotação e 3 blocos de texto | Uma **cena 3D** que mostra a ideia: o shopping, as lojas e os sinais de venda subindo de cada loja |
| A explicação é só texto | Introdução em **4 cenas animadas ao rolar**: Sinal → Decisão → Ação → Medição |
| Depois do login, a pessoa cai direto em Oportunidades | **Tour de boas-vindas** na primeira entrada, com 4 passos curtos sobre as telas principais |

**O que não muda:** o layout atual. A coluna centralizada, o card de login no topo e o bloco institucional continuam. O 3D entra **atrás do título**, no lugar do fundo de grade, e as cenas entram **abaixo do card**, ampliando o `Institucional`.

---

## 2. Conflito com a regra atual (decisão necessária)

O docs/08 §2.6 e §4.3 **proíbem WebGL** (`three`, `ogl`, `@react-three/*`) por peso e bateria do celular do balcão. 3D de verdade exige abrir uma exceção. Proposta em 2 níveis:

| Nível | Técnica | Peso | Onde roda | Recomendação |
| --- | --- | --- | --- | --- |
| **N1: 3D em CSS** | `perspective`, `transform-style: preserve-3d` e `rotateX/Y`, com cubos e planos em HTML/SVG | ~0 kB (sem dependência) | Todos os aparelhos | **Fazer primeiro.** Já dá a sensação de profundidade (shopping isométrico) |
| **N2: WebGL** | `three` + `@react-three/fiber` (+ `drei` só o necessário), carregados sob demanda | ~150–200 kB gzip, **fora do bundle inicial** | Só desktop, sem reduced motion e sem economia de dados | **Opcional**, como camada extra por cima do N1 |

**Exceção proposta para o docs/08:** WebGL permitido **só na página inicial pública**, em chunk `lazy` carregado depois do primeiro desenho da página, com o N1 como fallback. Painel, balcão e telas internas continuam sem WebGL.

> **Decisão pendente (Mestre Gabriel):** (a) só N1 (recomendado para a banca: zero risco), ou (b) N1 + N2 no desktop.

---

## 3. Conceito visual: "Vitrine de sinais"

```
            ┌─ Cena 3D (atrás do título) ─────────────────────────────┐
            │      piso do shopping em perspectiva isométrica          │
            │   ▢ moda   ▢ calçados   ▢ eletrônicos   ▢ presentes      │  ← lojas = blocos retos
            │     │ ●        │ ●            │ ●            │           │
            │     ▲ violeta  ▲ coral        ▲ âmbar                     │  ← sinais subindo
            │   vendeu    procurou e     estoque                        │
            │             não tinha      parado                         │
            │   sinais convergem num painel → "3 decisões da semana"    │
            └──────────────────────────────────────────────────────────┘
```

- **Lojas** como blocos retos (identidade geométrica do docs/08), cada uma com o rótulo do segmento: reforça "lojistas de shopping, de diferentes segmentos".
- **Sinais** como pulsos que sobem das lojas nas cores semânticas: violeta = venda, coral = procura sem estoque, âmbar = estoque parado.
- Os pulsos **convergem** num cartão "3 decisões da semana", a promessa do produto.
- Movimento lento e contínuo (rotação de 6–8° no eixo Y, em ciclo de ~20 s). No desktop, parallax leve com o mouse (máx. 4°). No toque, sem parallax.
- Cores só por tokens (`--color-violeta-500`, `--color-coral-500`, `--color-ambar`), nos dois temas.

---

## 4. Estrutura da página inicial (mantendo o layout)

| # | Bloco | Hoje | Depois |
| --- | --- | --- | --- |
| 1 | Logo + título BlurText + subtítulo | Existe | Mantém. A cena 3D fica atrás, com opacidade suficiente para o título continuar legível (contraste AA) |
| 2 | Card de login (SpotlightCard + StarBorder) + demo | Existe | Mantém, sem mudança. Novo botão secundário **"Ver como funciona"**, que rola até o bloco 4 |
| 3 | Frase em rotação com gradiente | Existe | Mantém |
| 4 | **Introdução em 4 cenas** (novo) | — | Ver §5 |
| 5 | **Para quem é** (novo) | — | Cartões dos 3 papéis: Dono/Gerente (decide), Atendente (registra no balcão por voz) e o shopping como contexto (vários segmentos, um público em comum) |
| 6 | **Telas do produto** (novo) | — | 3 prints reais (Oportunidades, Meu público, Agente) em cartões inclinados em 3D CSS, que endireitam ao passar o mouse ou ao entrar na tela |
| 7 | O que somos / Para que serve / Como funciona | Existe | Mantém (já fala do shopping) |
| 8 | Quem somos + equipe + LGPD | Existe | Mantém |

No celular a ordem é a mesma e o login continua visível sem rolar.

---

## 5. Introdução em 4 cenas (ao rolar)

Cada cena é uma faixa com texto curto à esquerda e uma animação à direita (empilhadas no celular). A animação dispara ao entrar na tela (IntersectionObserver), roda uma vez e para.

| Cena | Pergunta do lojista | Texto (rascunho) | Animação |
| --- | --- | --- | --- |
| **1. Sinal** | "O que está acontecendo na minha loja?" | "O caixa mostra o que vendeu. Nós mostramos também o que o cliente procurou e não levou." | Balcão: frase falada aparece digitada → vira cartão "Calça 42 · sem estoque" |
| **2. Decisão** | "O que eu faço com isso?" | "Até 3 oportunidades por semana, com evidência, amostra e limitação." | 3 cartões entram numerados 1, 2 e 3; números com CountUp |
| **3. Ação** | "Quem eu chamo?" | "O agente encontra clientes que autorizaram contato e prepara a mensagem. Você aprova e envia." | Lista de clientes com motivos entrando (AnimatedList); botão "Aprovar" com ClickSpark |
| **4. Medição** | "Funcionou?" | "Avisamos quando o cliente contatado comprou. Ciclo fechado." | Funil Sugeridos → Aprovados → Enviados → Compraram, com CountUp e o sino tocando |

Barra de progresso fina no topo da seção (4 segmentos retos) mostra em que cena a pessoa está.

**Técnica:** IntersectionObserver + classes CSS. `animation-timeline: view()` só como melhoria progressiva onde o navegador suporta. **Sem gsap** (regra do docs/08).

---

## 6. Tour de boas-vindas (primeira entrada)

Depois do primeiro login, em `/` (Oportunidades):

1. **Boas-vindas:** "Este é o painel da sua loja no shopping. Em 4 passos você vê como usar."
2. **Oportunidades:** destaca o primeiro cartão. "Comece por aqui: até 3 decisões com evidência."
3. **Meu público:** destaca o item do menu. "Quem compra, o quê e quando."
4. **Agente:** destaca o item do menu. "Produto parado? O agente acha clientes. Você aprova."
5. *(Atendente)* tour próprio no Balcão: "Toque no microfone e fale o que o cliente procurou."

- Holofote reto (recorte com `box-shadow` gigante) + balão com "Próximo / Pular".
- Guardar "tour visto" por usuário e papel. Primeiro em `localStorage`; depois campo no backend para valer em qualquer aparelho.
- Pode ser reaberto em "Ajuda → Ver introdução" no menu.
- Teclado: Esc fecha, setas avançam, foco preso no balão. Leitor de tela: `role="dialog"` com título.

---

## 7. Efeitos (React Bits e próprios)

> Conferir nome e dependência no reactbits.dev antes de copiar (regra do docs/08 §4). Variante TS + Tailwind, cores trocadas por tokens.

| Efeito | Uso | Nível | Dependência |
| --- | --- | --- | --- |
| **Cena isométrica CSS** (próprio) | Hero 3D (§3) | N1 | — |
| **TiltedCard** (React Bits) | Prints das telas (bloco 6) | N1 | Verificar; se usar motion, carregar só neste chunk |
| **Stepper** (React Bits) ou próprio | Barra das 4 cenas e tour | N1 | Docs/08 §12: versão do registro usa @hugeicons → reimplementar |
| CountUp, AnimatedList, ClickSpark, FadeContent, BlurText, Squares | Cenas 1–4 e fallback | N1 | Já existem |
| **Hyperspeed / Particles / Orb** (React Bits, WebGL) | Só se N2 for aprovado: partículas de sinais no hero | N2 | `three` ou `ogl`, chunk lazy |
| Cena R3F própria | Alternativa ao item acima: lojas em 3D real + pulsos | N2 | `three`, `@react-three/fiber` |

O docs/08 §5.2 rejeitou TiltedCard **no painel** ("movimento que não informa nada"). Na página inicial ele informa: mostra as telas reais. Exceção restrita à página pública.

---

## 8. Desempenho e acessibilidade

| Regra | Como |
| --- | --- |
| Login rápido | Cena N1 sem dependência; cenas 4–6 e o tour em chunks `lazy` |
| N2 não pesa no início | `import()` só depois de `requestIdleCallback` + desktop + sem `prefers-reduced-motion` + sem `navigator.connection.saveData` + `hardwareConcurrency ≥ 4` |
| Bateria | Pausar animação com a aba oculta e quando a cena sai da tela; limitar a 30 fps no N2 |
| Movimento reduzido | Cena vira imagem estática (estado final); cenas mostram o resultado sem animar; tour sem transições |
| Contraste | Título sobre a cena com AA; véu de `--background` a 70% atrás do texto se preciso |
| Sem informação só no efeito | Todo texto das cenas existe em HTML; a animação apenas ilustra |
| Métricas | LCP < 2,5 s em 4G, CLS < 0,1, 60 fps no desktop médio, bundle inicial ≤ +25 kB gzip (só N1) |

---

## 9. Tarefas

| ID | Tarefa | Arquivos | Pronto quando | Dep. |
| --- | --- | --- | --- | --- |
| I0 | Decidir N1 ou N1+N2 (§2) e registrar a exceção no docs/08 | `docs/08-...md` | Decisão escrita | — |
| I1 | Medir LCP e bundle do login atual (base) | este arquivo §11 | Números anotados | — |
| I2 | `CenaVitrine` em 3D CSS: piso, 4 lojas por segmento, pulsos, convergência no cartão | `components/efeitos/VitrineIsometrica.tsx`, `components/midia/destaques.tsx` (ponte `CenaSinais`) | 375/1280 px, claro/escuro, reduced motion estático | I0 |
| I3 | Encaixar a cena atrás do título sem mudar o layout; manter Squares como fallback | `features/auth/LoginPage.tsx` | Título com contraste AA | I2 |
| I4 | Botão "Ver como funciona" com rolagem até a introdução | `LoginPage.tsx` | Funciona por teclado | — |
| I5 | Seção "Introdução em 4 cenas" com barra de progresso | `components/midia/introducao/*` (lazy) | 4 cenas animam ao entrar e param | I2 |
| I6 | Bloco "Para quem é" (3 papéis + contexto do shopping) | `components/midia/institucional.tsx` | Texto revisado | — |
| I7 | Prints reais das telas + cartão inclinado (TiltedCard adaptado) | `public/telas/*.webp`, `components/efeitos/CartaoInclinado.tsx` | Imagens < 120 kB cada, `loading="lazy"` | — |
| I8 | Tour de boas-vindas (gerente e atendente) | `features/tour/*`, `AppShell.tsx`, `BalcaoShell.tsx` | Esc/setas/foco ok; aparece só uma vez | — |
| I9 | Persistir "tour visto" no backend (opcional) | `apps/contas` (campo em `Vinculo` ou preferência do usuário) + migração | Vale entre aparelhos | I8 |
| I10 | *(se N2)* Cena WebGL lazy por cima do N1 | `components/efeitos/VitrineWebGL.tsx` | Fora do bundle inicial; cai no N1 se falhar | I0, I2 |
| I11 | Testes: reduced motion (cena estática, cenas sem animação), tour (abre uma vez, Esc fecha) | `*.test.tsx` | `npm test` verde | I2–I8 |
| I12 | Revisão em 375/768/1280/1536, claro/escuro; medir LCP e bundle de novo | — | Metas do §8 | todas |

Ordem sugerida: **I0 → I1 → I2 → I3 → I4 → I5 → I6 → I7 → I8 → I11 → I12**, com I9 e I10 opcionais.
Cada bloco vira um PR: (I0–I4) hero 3D · (I5–I7) introdução · (I8–I9) tour · (I10) WebGL.

---

## 10. Riscos

| Risco | Mitigação |
| --- | --- |
| 3D tira o foco do login | Card de login continua no topo e visível sem rolar; cena atrás com opacidade controlada |
| Peso e bateria (WebGL) | N1 primeiro; N2 só desktop, lazy, 30 fps, pausa fora da tela |
| Projetor da banca ou máquina fraca | N1 roda em qualquer navegador; plano B é imagem estática |
| Tour irritar quem já conhece | Aparece só uma vez, botão "Pular" e reabertura manual |
| Prints desatualizados | Gerar a partir do `seed_demo` no fim do I12 |

---

## 11. Métricas base (preencher em I1)

| Métrica | Antes | Depois (N1) | Depois (N2) |
| --- | --- | --- | --- |
| JS inicial gzip | 159,4 kB (build de 13/11) | | |
| CSS inicial gzip | 25,0 kB | | |
| LCP do `/login` (4G simulado) | | | |
| fps da cena (desktop médio) | — | | |

---

## 12. Decisões pendentes

1. N1 (3D em CSS) ou N1 + N2 (WebGL no desktop)? (§2)
2. A página inicial pública continua em `/login` ou ganha rota própria (`/` para visitante, `/login` só formulário)? Recomendação: manter `/login` para não mexer no roteamento e nos guards.
3. Tour salvo só no navegador ou também no backend? (I9)
4. Quais 3 telas entram nos prints? Sugestão: Oportunidades, Meu público, Agente.
