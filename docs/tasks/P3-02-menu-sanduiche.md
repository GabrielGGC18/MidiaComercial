# P3-02 · Menu sanduíche (☰) bem feito, para celular e tablet

**Dono:** Pessoa 3 · **Prioridade:** P1 · **Estimativa:** 5 h · **Depende de:** P3-01 (layout do `AppShell` já corrigido)

## Problema

Abaixo de 1024 px (celular **e tablet**), a navegação hoje é:

- **Header** (`AppShell.tsx:171`) só com logo, nome da loja e sino. Não tem menu.
- **Menu inferior** com 4 atalhos + "Mais" (`AppShell.tsx:190`).
- **"Mais"** abre uma gaveta de baixo (`AppShell.tsx:229`) com o que sobrou, numa lista solta, **sem os grupos** "Analisar · Agir · Dados" da sidebar desktop.

Isso causa três problemas:

1. Achar "Clientes" ou "Importar dados" exige saber que estão escondidos em "Mais".
2. No tablet (768 a 1023 px) aparece o menu de celular, com a tela larga e vazia.
3. Trocar de loja, mudar o tema e sair ficam no fundo da gaveta "Mais".

## Objetivo

Um botão **☰ no canto esquerdo do header** abre uma **gaveta lateral esquerda** com:

1. Logo e nome da loja.
2. A navegação **com os mesmos grupos da sidebar** ("Analisar · Agir · Dados"), com o item ativo marcado igual ao desktop (barra de 3 px violeta).
3. No rodapé: o seletor de loja, o nome do usuário, o tema e o botão Sair.

O menu inferior continua com 4 atalhos de uso frequente. **O "Mais" sai**, porque o ☰ substitui ele, e o 5º espaço vira o botão "IA".

## Requisitos de qualidade ("bem feito")

| Requisito | Como |
| --- | --- |
| Acessível | `aria-label="Abrir menu"`, `aria-expanded`, `aria-controls`. O foco fica preso dentro da gaveta, `Esc` fecha e o foco volta ao ☰ ao fechar. O Radix Dialog já faz isso; não reinvente |
| Fecha sozinho | Ao navegar (troca de `pathname`), ao trocar de loja e ao clicar fora |
| Sem rolar o fundo | O Radix trava o scroll do `body` |
| Alvos de toque | Itens de 48 px de altura, ☰ de 44 px |
| Largura | `w-[min(320px,85vw)]`, para que a gaveta nunca cubra a tela toda e sobre área de toque para fechar |
| Safe area | `pt-[env(safe-area-inset-top)]` e `pb-[env(safe-area-inset-bottom)]` (iPhone) |
| Movimento | Desliza da esquerda em 200 ms. Com `prefers-reduced-motion`, só aparece, sem deslizar (use `useMenosMovimento`) |
| Geometria | Reta: borda só à direita, sem `rounded-*` na gaveta |
| Uma fonte de verdade | O ☰ e a sidebar usam o **mesmo** array `GRUPOS`. Item novo entra num lugar só |
| Por papel | O item "Loja e equipe" (P2-05) aparece só para o dono, nos dois menus |

## Onde mexer

- `frontend/src/components/ui/dialog.tsx`: novo lado `"esquerda"`.
- `frontend/src/app/layouts/AppShell.tsx`.
- Novo `frontend/src/app/layouts/NavGrupos.tsx`: a lista de grupos, reaproveitada pela sidebar e pelo ☰.

## Passo a passo

1. **Lado "esquerda" no Dialog** (`dialog.tsx`, linhas 15 a 21):
   ```tsx
   lado?: "centro" | "baixo" | "direita" | "esquerda"
   // ...
   esquerda: "inset-y-0 left-0 w-[min(320px,85vw)] border-r p-0 data-[state=open]:animate-[gaveta-esq_200ms_ease-out]",
   ```
   No `styles/tokens.css`, crie a animação junto das outras:
   ```css
   @keyframes gaveta-esq { from { transform: translateX(-100%); } to { transform: translateX(0); } }
   @media (prefers-reduced-motion: reduce) { [class*="gaveta-esq"] { animation: none !important; } }
   ```
   > **Aproveite para corrigir a geometria.** Os lados atuais usam `rounded-xl`, `rounded-t-xl` e `rounded-l-xl`, o que contraria a regra de geometria reta do docs/08. Troque por `rounded-md` no `centro` e por nada nos lados (`baixo` e `direita`).
2. **Extraia os grupos** para `NavGrupos.tsx`:
   ```tsx
   type Props = { recolhida?: boolean; grande?: boolean; onNavegar?: () => void };

   export function NavGrupos({ recolhida, grande, onNavegar }: Props) {
     const { me } = useAuth();
     return (
       <nav aria-label="Principal" className="flex flex-col gap-4">
         {GRUPOS.map((g) => {
           const itens = g.itens.filter((i) => !i.papel || temPapel(me?.papel, i.papel));
           if (!itens.length) return null;
           return (
             <div key={g.titulo} role="group" aria-labelledby={`grupo-${g.titulo}`} className="flex flex-col gap-0.5">
               {!recolhida && <p id={`grupo-${g.titulo}`} className="sobretitulo px-3 pb-1 text-tinta-300 dark:text-tinta-500">{g.titulo}</p>}
               {itens.map(({ to, rotulo, Icone, fim }) => (
                 <NavLink key={to} to={to} end={fim} onClick={onNavegar}
                   className={({ isActive }) => linkCls({ isActive, recolhida, grande })}>
                   <Icone className="size-[18px] shrink-0" aria-hidden />
                   {!recolhida && <span className="truncate">{rotulo}</span>}
                 </NavLink>
               ))}
             </div>
           );
         })}
       </nav>
     );
   }
   ```
   - Mova o `GRUPOS` e o `linkCls` para esse arquivo.
   - O `Item` ganha `papel?: Papel`, para filtrar por papel.
   - `grande` deixa o item com `h-12`: alvo de 48 px na gaveta.
3. **Header mobile** com o ☰ à esquerda:
   ```tsx
   const [menu, setMenu] = useState(false);
   useEffect(() => setMenu(false), [local.pathname]);

   <header className={cn("sticky z-20 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-2 backdrop-blur lg:hidden", ...)}>
     <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menu" aria-expanded={menu} aria-controls="menu-gaveta"
       className="grid size-11 place-items-center rounded-md hover:bg-muted">
       <Menu className="size-5" aria-hidden />
     </button>
     <Logo />
     <div className="ml-auto flex items-center gap-1">
       <Sino alinhar="direita" />
     </div>
   </header>
   ```
   O nome da loja sai do header (ele cortava em `max-w-[40vw]`) e vai para o topo da gaveta.
4. **A gaveta:**
   ```tsx
   <Dialog open={menu} onOpenChange={setMenu}>
     <DialogContent id="menu-gaveta" lado="esquerda" aria-describedby={undefined}
       className="flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
       <div className="flex h-14 items-center justify-between border-b border-border px-4">
         <DialogTitle className="truncate text-sm font-semibold">{me?.loja?.nome}</DialogTitle>
         <DialogClose aria-label="Fechar menu" className="grid size-11 place-items-center rounded-md hover:bg-muted">
           <X className="size-5" />
         </DialogClose>
       </div>
       <div className="flex-1 overflow-y-auto px-3 py-4">
         <NavGrupos grande onNavegar={() => setMenu(false)} />
       </div>
       <div className="flex flex-col gap-2 border-t border-border p-3">
         <StoreSwitcher lojas={me?.lojas ?? []} atual={me?.loja ?? null} onTrocar={(id) => { setMenu(false); trocar(id); }} />
         {/* nome do usuário + tema + sair: copie o rodapé da sidebar, com alvos de 44 px */}
       </div>
     </DialogContent>
   </Dialog>
   ```
   Se `DialogClose` não for exportado em `ui/dialog.tsx`, exporte: `export const DialogClose = D.Close;`.
5. **Menu inferior:**
   - Tire o botão "Mais" e o `Dialog` do "Mais" (linhas 204 a 207 e 229 em diante).
   - No 5º espaço, ponha o botão **IA** (abre a gaveta do agente). Assim o botão flutuante deixa de existir no celular e para de cobrir o conteúdo, o que já resolve um item da P3-03.
     ```tsx
     <button type="button" onClick={() => setIa(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-violeta-600">
       <Sparkles className="size-5" aria-hidden /> IA
     </button>
     ```
   - O botão flutuante fica só no desktop: troque a classe dele para `hidden lg:inline-flex`.
6. **A sidebar desktop** passa a usar `<NavGrupos recolhida={recolhida} />`. O visual tem que ficar idêntico ao de hoje.

## Como testar

- **375 px:**
  - o ☰ abre; `Tab` circula só dentro da gaveta; `Esc` fecha e o foco volta ao ☰;
  - clicar num item navega e fecha;
  - clicar fora fecha;
  - o fundo não rola com a gaveta aberta.
- **768 px (tablet):** a gaveta tem 320 px e sobra área de toque à direita.
- **Por papel:** como dono, aparece "Loja e equipe" (depois da P2-05); como gerente, não aparece.
- **Movimento reduzido:** no DevTools, abra Rendering > "Emulate CSS prefers-reduced-motion: reduce". A gaveta aparece sem deslizar.
- **Teste automatizado** em `AppShell.test.tsx` (Testing Library):
  ```tsx
  it("abre e fecha o menu sanduíche", async () => {
    render(<Wrapper><AppShell /></Wrapper>);
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Clientes/ })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  ```

## Pronto quando

- [ ] O ☰ abre a gaveta esquerda com os grupos, a loja, o tema e o Sair.
- [ ] A gaveta fecha ao navegar, com `Esc` e ao clicar fora; o foco é gerenciado.
- [ ] A sidebar e o ☰ usam o mesmo `GRUPOS`, filtrado por papel.
- [ ] O "Mais" saiu e a IA ficou no menu inferior. Não há botão flutuante no celular.
- [ ] Os lados do Dialog não têm mais `rounded-xl`.
- [ ] Há teste, e prints em 375 px e 768 px nos temas claro e escuro.
