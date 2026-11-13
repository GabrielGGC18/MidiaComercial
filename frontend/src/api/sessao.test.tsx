import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
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

afterEach(() => vi.restoreAllMocks());

it("Sair atualiza a tela sem precisar de F5 (P1-08)", async () => {
  const me = { usuario: { nome: "Marina" }, papel: "gerente", loja: { id: 1 }, lojas: [] };
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    String(url).endsWith("/api/me")
      ? new Response(JSON.stringify(me), { status: 200, headers: { "content-type": "application/json" } })
      : new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } }),
  );
  const qc = new QueryClient();
  qc.setQueryData(["dados-da-loja"], ["cliente"]);
  render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Quem />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await screen.findByText("logado:Marina");
  await act(async () => screen.getByText("Sair").click());
  await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/api/auth/logout"))).toBe(true);
  expect(qc.getQueryData(["dados-da-loja"])).toBeUndefined();
});
