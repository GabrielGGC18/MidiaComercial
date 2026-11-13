# P3-03 · Responsividade e uso em telas menores (320 a 1023 px)

**Dono:** Pessoa 3 · **Prioridade:** P1 · **Estimativa:** 1 dia · **Depende de:** P3-01, P3-02 · **Combinar com:** P1-06 (mexe em `ClientesPage.tsx`)

## Problemas encontrados (prints em 375 px, logado como gerente, atendente e dono)

| # | Tela | Problema | Evidência |
| --- | --- | --- | --- |
| 1 | Todas | O botão flutuante "IA" (48×48) **cobre conteúdo**: o selo "Autorizou" do 1º cliente, o canto do KPI "Ticket médio" | `AppShell.tsx:215`, `fixed bottom-20 right-4` |
| 2 | Clientes | Os 4 filtros ocupam a **tela inteira** antes do 1º cliente aparecer | `features/clientes/ClientesPage.tsx` |
| 3 | Clientes | O selo "Autorizou" corta no cartão ("Autori…") | mesmo arquivo, cartão mobile |
| 4 | Oportunidades | Os 3 KPIs empilham e ocupam ~3 telas de rolagem antes da 1ª oportunidade, que é o que importa | `features/oportunidades/` |
| 5 | Balcão | O placeholder corta e há um buraco de espaço (está na **P1-07**, não refaça) | — |
| 6 | Gaveta da IA (celular) | `rounded-t-xl` foge da geometria reta; 85dvh esconde o teclado em alguns Androids | `AppShell.tsx:221` |
| 7 | Geral | Nunca testamos 320 px (iPhone SE e Android pequeno), nem o tablet em pé (768 px) | — |

## Regras de responsividade (cole no PR e siga)

1. **Mobile primeiro:** a classe sem prefixo é o celular; `sm:` (640), `md:` (768) e `lg:` (1024) acrescentam.
2. **Nada estoura na horizontal em 320 px:**
   - `document.documentElement.scrollWidth <= innerWidth`;
   - todo filho de flex ou grid com texto leva `min-w-0`;
   - texto longo usa `truncate` ou `break-words`.
3. **Alvos de toque de 44 px no mínimo** (`size-11` / `h-11`); 48 px em listas de navegação.
4. **Tabela não vai para o celular:** abaixo de `md`, vira lista de cartões. A tabela aparece em `md:` ou acima.
5. **Filtros no celular** ficam atrás de um botão "Filtros (n)", que abre uma gaveta de baixo. Os filtros ativos aparecem como chips removíveis.
6. **O mais importante primeiro:**
   - em telas pequenas, a ordem visual segue a prioridade da tarefa, e não a do desktop;
   - use `order-*` ou reordene o JSX.
7. **Fixos não cobrem conteúdo:**
   - todo elemento `fixed` exige um espaço reservado no fim da página (`pb-*`);
   - ou ele deve sair do caminho.
8. **Tipografia fluida em números grandes:** `text-[clamp(1.5rem,6vw,2.25rem)]`, como já feito no KPI.
9. **Teclado virtual:**
   - campos no fim da tela usam `scroll-margin-bottom`;
   - as gavetas usam `dvh`, e não `vh`.

## Passo a passo por item

### 1. Botão flutuante da IA

Se a P3-02 já foi feita, ele não existe mais no celular (a IA foi para o menu inferior). Confira só o desktop. Lá, o botão fica em `bottom-6 right-6` e pode cobrir a última linha de uma tabela: garanta `lg:pb-24` no `main`.

### 2 e 3. Clientes

- **Filtros:** em `max-md`, renderize um botão e uma gaveta, e mantenha a busca visível:
  ```tsx
  <div className="flex gap-2 md:hidden">
    <Input className="min-w-0 flex-1" placeholder="Buscar nome ou código" value={q} onChange={...} />
    <Button variant="outline" className="h-11 shrink-0" onClick={() => setFiltros(true)}>
      <SlidersHorizontal className="size-4" aria-hidden /> Filtros{ativos > 0 && ` (${ativos})`}
    </Button>
  </div>
  <div className="hidden md:grid md:grid-cols-4 md:gap-3">{/* filtros como estão hoje */}</div>
  ```
  Dentro da gaveta (`lado="baixo"`) ficam os selects de idade, tamanho e consentimento, mais "Limpar" e "Ver N clientes". Embaixo da busca, mostre os chips dos filtros ativos com ✕ para remover.
- **Selo cortado:** no cartão, o cabeçalho é `flex`. Dê `min-w-0 flex-1` ao bloco do nome e `shrink-0` ao selo. Se não couber, o selo desce para a linha de baixo (`flex-wrap`).
- **Ações do topo** (Importar, Exportar, Novo): no celular, o "Novo" é a ação principal, em largura total. Importar e Exportar vão para um menu "⋯" ou para uma linha menor. Combine com o padrão da P3-02.

### 4. Oportunidades

Em `max-md`, a 1ª oportunidade tem que aparecer na primeira tela. Escolha uma das duas soluções e justifique no PR:

- **Opção A:** KPIs numa faixa horizontal com rolagem lateral, cartões compactos de 160 px (`flex snap-x overflow-x-auto`), com indicação visual de "tem mais" (degradê na borda).
- **Opção B:** um KPI só (o coral, "Procuraram e não tinha") e um link "Ver números", que expande os outros.

Com qualquer opção: `PageHeader` → destaque → **lista de oportunidades** → KPIs. Em `md:` ou acima, volta à ordem atual.

### 6. Gaveta da IA no celular

- Troque `max-lg:rounded-t-xl` por nada.
- Troque a altura `85dvh` por `max-lg:h-[min(85dvh,100%)]`.
- Garanta que o campo de texto fica visível com o teclado aberto: `scroll-margin-bottom` no input, ou o input `sticky bottom-0` dentro da gaveta.

A P3-04 refaz o chat; combine para não fazer duas vezes.

### 7. Varredura em 320, 375, 768 e 1023 px

Rode o script abaixo. Ele usa o Playwright, que **ainda não está no projeto**. Instale como dependência de dev dentro de `frontend/`:

```bash
npm i -D playwright
npx playwright install chromium
```

Justifique a dependência nova no PR: ela é só de dev e serve para a varredura e, no futuro, para testes de ponta a ponta. Se preferir não instalar, faça à mão no DevTools com "Dimensions: Responsive". Para cada tela, anote no PR: ✅ ok, ou ❌ o problema e a correção.

```js
// frontend/scripts/varredura.mjs: rode com `node scripts/varredura.mjs` dentro de frontend/ (o servidor precisa estar no ar)
import { chromium } from "playwright";
const B = "http://localhost:5173";
const rotas = ["/", "/publico", "/demanda", "/acoes", "/agente", "/clientes", "/importar", "/balcao"];
const br = await chromium.launch();
const pg = await (await br.newContext()).newPage();
await pg.goto(B + "/login");
await pg.fill('input[autocomplete="username"]', "gerente.centro");
await pg.fill('input[type="password"]', "demo1234");
await pg.keyboard.press("Enter");
await pg.waitForURL((u) => !u.pathname.startsWith("/login"));
for (const w of [320, 375, 768, 1023]) {
  await pg.setViewportSize({ width: w, height: 800 });
  for (const r of rotas) {
    await pg.goto(B + r);
    await pg.waitForLoadState("networkidle");
    const estoura = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(`${w}px ${r}${estoura ? "  ❌ ESTOURA NA HORIZONTAL" : ""}`);
    await pg.screenshot({ path: `varredura/${w}${r.replace(/\//g, "_") || "_inicio"}.png`, fullPage: true });
  }
}
await br.close();
```

> A pasta `varredura/` **não** vai para o git: os prints vão no PR. Adicione `varredura/` ao `.gitignore`.

## Como testar

O script não acusa nenhum "ESTOURA" e as 4 larguras ficam ok em todas as rotas. Confira também como atendente (`ana`) e como dono (`dono.centro`).

## Pronto quando

- [ ] Os itens 1, 2, 3, 4, 6 e 7 da tabela estão resolvidos (o 5 é da P1-07).
- [ ] O script da varredura está versionado e o resultado está colado no PR.
- [ ] Nenhuma rota estoura em 320 px.
- [ ] As regras de responsividade foram copiadas para o `.claude/agents/frontend-react.md` (seção "Responsivo"), para valerem daqui em diante.
