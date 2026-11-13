# P1-08 · "Sair" não volta para o login (bug P0)

**Dono:** Pessoa 1 · **Prioridade:** P0 (faça junto com a P1-01, no dia 1) · **Estimativa:** 2 h · **Depende de:** nada

## Problema (reproduzido no navegador)

1. Entre como `gerente.centro` (ou `ana`) e clique em **Sair**.
2. A tela **continua a mesma** (`/` ou `/balcao`) e os blocos passam a mostrar o erro **"Faça login para continuar."**.
3. Só ao dar **F5** a pessoa vai para a tela de login.

O que a rede mostra no momento do clique:

```
POST /api/auth/logout        200   ← o servidor encerrou a sessão (está certo)
GET  /api/oportunidades/     401   ← a tela continuou montada e buscou dados sem sessão
GET  /api/notificacoes/      401
(nenhum GET /api/me)                ← o front nunca soube que o usuário saiu
```

## Causa

`frontend/src/api/sessao.tsx`, função `reiniciar`:

```ts
const reiniciar = (me: Me | null) => {
  qc.clear();                  // 1. apaga TODAS as queries do cache, inclusive a ["me"]
  qc.setQueryData(["me"], me); // 2. cria uma query ["me"] NOVA, com null
};
```

- O `useQuery({ queryKey: ["me"] })` do `AuthProvider` estava "assistindo" a query **antiga**.
- O `qc.clear()` remove essa query sem avisar o observador.
- O `setQueryData` cria uma query **nova**, que ninguém está assistindo.
- Resultado: o `AuthProvider` não re-renderiza e o `me` continua com o usuário antigo. Os guards (`RequireLoja`) acham que ainda tem gente logada, então a tela fica. O `nav("/login")` do `AppShell` até tenta ir, mas o guard devolve.
- **No login funciona por acaso:** o `useMutation` de login muda de estado e força o re-render do `AuthProvider`, que então pega a query nova. O `sair` não usa mutation, por isso quebra.
- **O handler global de 401** (`app/providers.tsx:10`) também não salva: ele invalida `["me"]`, mas a query nova não tem observador, então nada é buscado de novo.

> **Já testamos a correção abaixo no navegador:** o Sair vai direto para `/login`, sem nenhum 401.

## Onde mexer

- `frontend/src/api/sessao.tsx` (correção)
- `frontend/src/api/sessao.test.tsx` (novo teste)
- conferir: `app/layouts/AppShell.tsx` (`logout`) e `app/layouts/BalcaoShell.tsx` (botão Sair)

## Passo a passo

1. **Atualize o `me` na query que já existe** (isso avisa o observador) e só depois apague as outras:
   ```ts
   // Trocar de loja/usuário limpa o cache dos dados, nunca mistura lojas (§6.3).
   // Não use qc.clear(): ele desliga o useQuery(["me"]) do AuthProvider e a tela não fica sabendo.
   const reiniciar = async (me: Me | null) => {
     await qc.cancelQueries();                                          // para buscas em andamento
     qc.setQueryData(["me"], me);                                       // avisa o AuthProvider → re-render → guards
     qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });    // apaga os dados da loja/usuário anterior
   };
   ```
   - **Por que `cancelQueries` primeiro:** uma busca que começou antes do Sair pode terminar depois e regravar dado da sessão antiga no cache.
   - **Por que `removeQueries` e não `invalidateQueries`:** invalidar busca de novo, e logo sem sessão, gerando 401. Remover só apaga.
2. Como `reiniciar` virou `async`, ajuste quem chama:
   ```ts
   sair: async () => {
     await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
     await reiniciar(null);
   },
   trocarLoja: async (lojaId) => {
     const me = await api<Me>("/api/me/loja", { method: "POST", body: json({ loja_id: lojaId }) });
     await reiniciar(me);
     return me;
   },
   ```
   No `login`, o `onSuccess: reiniciar` aceita uma função async sem mudança.
3. **Confira a troca de loja.** Ela usa o mesmo `reiniciar` e tinha o mesmo risco: a tela continuar mostrando a loja anterior até o F5. Troque de loja (o `admin` tem 2 lojas) e veja se o nome no header muda na hora.
4. **Se o logout falhar no servidor** (rede caiu): hoje o `.catch(() => undefined)` engole o erro e o front sai mesmo assim. Está certo, porque é melhor sair localmente. Mas garanta que nada fica no cache. O passo 1 já garante.
5. **Nada de dado da sessão anterior na próxima pessoa.** Teste no mesmo navegador:
   - Entre como gerente e abra Clientes.
   - Saia e entre como `ana`.
   - Volte com o botão "voltar" do navegador: não pode aparecer a lista de clientes vinda do cache.

## Teste automatizado

```tsx
// frontend/src/api/sessao.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { AuthProvider, useAuth } from "./sessao";

function Quem() {
  const { me, sair } = useAuth();
  return (
    <div>
      <span>{me ? `logado:${me.usuario.nome}` : "deslogado"}</span>
      <button onClick={() => void sair()}>Sair</button>
    </div>
  );
}

it("Sair atualiza a tela sem precisar de F5", async () => {
  const me = { usuario: { nome: "Marina" }, papel: "gerente", loja: { id: 1 }, lojas: [] };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    String(url).includes("/api/me")
      ? new Response(JSON.stringify(me), { status: 200 })
      : new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider><Quem /></AuthProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("logado:Marina");
  await act(async () => screen.getByText("Sair").click());
  await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
});
```

> **Antes de corrigir, rode o teste: ele tem que FALHAR** (fica em "logado:Marina"). Depois da correção, passa. Assim você prova que o teste pega o bug. Se o `api()` usar outra função para buscar (confira em `api/client.ts`), ajuste o mock.

## Como testar à mão

| Perfil | Ação | Esperado |
| --- | --- | --- |
| `gerente.centro`, 1280 px | Sair pela sidebar | Vai na hora para `/login`, sem erro na tela |
| `ana`, 375 px | Sair pelo balcão | Vai na hora para `/login` |
| `gerente.centro`, 375 px | Sair pela gaveta ("Mais", ou o ☰ depois da P3-02) | Vai na hora para `/login` |
| `admin` | Trocar de loja | O nome no header muda na hora |

No DevTools, aba Network: depois do `POST /api/auth/logout 200` **não pode** aparecer nenhum 401.

## Pronto quando

- [ ] O Sair leva direto ao login nos 3 lugares (sidebar, balcão e gaveta mobile), sem F5.
- [ ] Nenhum 401 depois do logout.
- [ ] A troca de loja atualiza o header na hora.
- [ ] O teste do `sessao.test.tsx` falha antes da correção e passa depois.
- [ ] Os dados da sessão anterior não reaparecem ao voltar pelo navegador.
