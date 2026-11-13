# P1-07 · Perfil atendente: tema, aviso de tela restrita e balcão mais limpo

**Dono:** Pessoa 1 · **Prioridade:** P2 · **Estimativa:** 3 h · **Depende de:** nada

## Problema (visto logado como `ana`, em 375 px e 1280 px)

1. **Sem tema escuro:** o `BalcaoShell` (`frontend/src/app/layouts/BalcaoShell.tsx`) não tem o botão de tema. O gerente tem esse botão no `AppShell` (`useTema`, linha 73). No balcão de loja com luz baixa, o tema escuro ajuda.
2. **Redireciona em silêncio:**
   - A atendente que abre `/clientes` ou `/` cai em `/balcao` sem saber por quê.
   - O `RequireLoja` (`frontend/src/features/auth/guards.tsx:21`) faz `<Navigate>` sem nenhuma mensagem.
3. **Texto cortado:** em 375 px, o placeholder do campo de voz aparece como "Toque no microfone e fa…" (`BalcaoPage.tsx:110`).
4. **Buraco na tela:** há um espaço vazio grande entre o botão "Registrar" e o aviso "Não digite nome…", nas duas larguras.
5. **Sem trocar de loja:** a atendente com vínculo em 2 lojas não tem como trocar no balcão. Só consegue saindo e entrando de novo.

## Onde mexer

- `frontend/src/app/layouts/BalcaoShell.tsx`
- `frontend/src/features/auth/guards.tsx`
- `frontend/src/features/demanda/BalcaoPage.tsx`

## Passo a passo

1. **Tema:** copie o padrão do `AppShell`.
   ```tsx
   import { Moon, Sun } from "lucide-react";
   import { useTema } from "@/lib/tema";
   // ...
   const { tema, alternar } = useTema();
   const IconeTema = tema === "escuro" ? Sun : Moon;
   // no header, antes do botão Sair:
   <button type="button" onClick={alternar} aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
     className="grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted">
     <IconeTema className="size-5" />
   </button>
   ```
   O alvo tem 44 px (`size-11`), porque é balcão. Hoje os botões estão em `size-10`: suba todos para `size-11`.
2. **Aviso de tela restrita:**
   - No guard, passe a rota negada no `state`:
     ```tsx
     if (papel && !temPapel(me.papel, papel))
       return <Navigate to={rotaInicial(me.papel)} replace state={{ negada: local.pathname }} />;
     ```
   - No `BalcaoShell` (e também no `AppShell`, para um gerente que tente uma tela de dono no futuro), leia uma vez e mostre o toast:
     ```tsx
     const local = useLocation();
     useEffect(() => {
       const negada = (local.state as { negada?: string } | null)?.negada;
       if (negada) toast.info("Essa tela é da gerência. Você está no balcão.");
     }, [local.state]);
     ```
   - Garanta que o toast não repete ao recarregar. O `replace` já limpa o `state` em navegações seguintes; confira.
3. **Placeholder:** troque por um texto curto, que caiba em 320 px: `"Toque e fale…"`. O exemplo completo já aparece embaixo ("Ex.: procurou calça jeans 42…"). Quando não há suporte a voz, use `"Ex.: calça 42, 40 anos, não tinha"`.
4. **Buraco:**
   - O suspeito principal é a região `aria-live` em `frontend/src/components/midia/demanda.tsx:205` (`<div aria-live="polite" className="min-h-14">`). Ela reserva 56 px para a mensagem "Registrado" mesmo vazia, e soma com as margens em volta.
   - Confirme no DevTools, passando o mouse no elemento entre "Registrar" e o aviso.
   - **Não remova a região `aria-live`**: o leitor de tela precisa dela já montada. Troque `min-h-14` por altura zero quando vazia (`empty:min-h-0`) ou posicione a mensagem por cima (`relative` no pai e `absolute` na mensagem). Assim o layout não pula quando a mensagem aparece.
5. **Trocar loja:** se `me.lojas.length > 1`, ponha no header um botão `Store` (lucide) que leva a `/lojas`. A `LojasPage` já existe.

## Como testar

- Logue como `ana` / `demo1234` e teste:
  - alternar o tema;
  - abrir `localhost:5173/clientes` e ver o toast, uma vez só;
  - em 320 px e 375 px, o placeholder cabe inteiro;
  - não há mais o buraco.
- `npm test` passa. Se quiser, crie um teste do guard com o `MemoryRouter`, verificando o `state.negada`.

## Pronto quando

- [ ] O balcão tem tema escuro, com alvos de 44 px.
- [ ] O redirecionamento mostra o motivo.
- [ ] Placeholder e espaçamento estão corrigidos.
- [ ] A troca de loja aparece quando o usuário tem mais de uma loja.
- [ ] Há prints em 375 px, nos temas claro e escuro, no PR.
