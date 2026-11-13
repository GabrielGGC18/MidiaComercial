# P3-01 · Centralizar as telas: conteúdo colado na lateral (bug P0 visual)

**Dono:** Pessoa 3 · **Prioridade:** P0 · **Estimativa:** 3 h · **Depende de:** nada

## Problema (medido)

Em monitor de 1920 px, o `<main id="conteudo">` fica assim:

| Lado | Medida |
| --- | --- |
| Distância da sidebar (à esquerda) | **0 px** (começa colado nela) |
| Sobra vazia à direita | **376 px** |
| Largura do conteúdo | 1280 px |

O resultado: o conteúdo fica grudado na sidebar e sobra um buraco do outro lado. É o "informações muito nas laterais".

**Causa:** `frontend/src/app/layouts/AppShell.tsx:179-184`.

```tsx
<main className={cn(
  "mx-auto min-w-0 max-w-[1280px] ...",
  recolhida ? "lg:ml-[72px] lg:pl-10" : "lg:ml-[264px] lg:pl-10",
)}>
```

O `mx-auto` centraliza usando `margin-left: auto` e `margin-right: auto`. O `lg:ml-[264px]` **sobrescreve o margin-left**, e só a margem direita continua automática. Por isso o bloco encosta à esquerda e o espaço todo sobra na direita.

## Regra de layout (vale para o projeto todo)

1. **O espaço da sidebar é reservado com `padding` num wrapper**, nunca com `margin` no mesmo elemento que centraliza.
2. **Larguras por tipo de tela:**
   | Tipo | Largura máxima | Exemplos |
   | --- | --- | --- |
   | Painel | 1200 px | Oportunidades, Público, Demanda, Clientes, Ações |
   | Formulário | 768 px (`max-w-3xl`) | Importar, Detalhe da ação, Loja e equipe |
   | Leitura e conversa | 760 px | Chat do agente (P3-04) |
3. **O cabeçalho da página (`PageHeader`) segue a mesma largura do conteúdo dela.** Título num lugar e card em outro não pode.

## Onde mexer

- `frontend/src/app/layouts/AppShell.tsx`
- `frontend/src/components/midia/estado.tsx` (`PageHeader`)
- as páginas de formulário: `features/importacao/ImportarPage.tsx` e `features/acoes/AcaoDetalhePage.tsx`

## Passo a passo

1. **Wrapper com padding** no `AppShell`:
   ```tsx
   <div className={cn("transition-[padding] duration-200", recolhida ? "lg:pl-[72px]" : "lg:pl-[264px]")}>
     <main
       id="conteudo"
       className="mx-auto w-full min-w-0 max-w-[1200px] overflow-x-clip px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
     >
       <Outlet />
     </main>
   </div>
   ```
   - O `w-full` garante que o `main` ocupe a largura e o `max-w` limite.
   - O `mx-auto` agora funciona, porque nenhuma margem o sobrescreve.
   - O `transition-[padding]` acompanha a animação da sidebar recolhendo, que já usa `transition-[width] duration-200`.
2. **Variante de largura** no `PageHeader` e num container de página. Crie um componente pequeno em `components/midia/estado.tsx`:
   ```tsx
   const LARGURA = { painel: "max-w-none", formulario: "max-w-3xl", leitura: "max-w-[760px]" } as const;

   export function Pagina({ largura = "painel", children }: {
     largura?: keyof typeof LARGURA; children: React.ReactNode;
   }) {
     return <div className={cn("mx-auto w-full", LARGURA[largura])}>{children}</div>;
   }
   ```
   O tipo `painel` não limita mais nada, porque o `main` já limita em 1200 px.
3. **Use** `<Pagina largura="formulario">` nas páginas de formulário (Importar e Detalhe da ação) e, depois, na `/loja` (P2-05).
4. **Confira as telas uma a uma em 1280 px, 1440 px e 1920 px:**
   - Oportunidades: os 3 KPIs continuam em 3 colunas, e o cartão de oportunidade não fica largo demais para ler. Se a linha de texto passar de ~90 caracteres, limite o parágrafo com `max-w-prose`.
   - Clientes: a tabela desktop ocupa a largura do painel; nenhuma coluna espremida.
   - Importar: centralizada, em 768 px.
   - O botão flutuante "Preencher com IA" não cobre conteúdo. Ele fica fixo à direita da janela, e isso está certo.
5. **Sidebar recolhida (72 px):** o conteúdo recentraliza sozinho. Teste o botão `«`.

## Como testar

No DevTools, cole este trecho no console. Ele mede as sobras dos dois lados do conteúdo:

```js
const b = document.getElementById("conteudo").getBoundingClientRect();
const sidebar = document.querySelector("aside")?.getBoundingClientRect().width ?? 0;
console.log({ esquerda: Math.round(b.left - sidebar), direita: Math.round(innerWidth - b.right) });
```

Em 1920 px, `esquerda` e `direita` devem dar **iguais** (diferença de até 1 px).

## Pronto quando

- [ ] As sobras esquerda e direita ficam iguais em 1440 px e 1920 px, com a sidebar aberta e recolhida.
- [ ] Existe o componente `Pagina` com as 3 larguras, usado nas telas de formulário.
- [ ] Nenhuma regressão em 375 px (o wrapper só tem padding no `lg:`).
- [ ] O PR tem prints de antes e depois em 1920 px.
