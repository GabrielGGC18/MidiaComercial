import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizarOrigem } from "../../middleware";
import { ApiError, api } from "./client";

describe("normalizarOrigem (API_ORIGEM da Vercel)", () => {
  it.each([
    "https://comercial-api.midia63.com.br",
    "https://comercial-api.midia63.com.br/",
    "https://comercial-api.midia63.com.br/api/",
    "  comercial-api.midia63.com.br\n",
    '"https://comercial-api.midia63.com.br"',
    "API_ORIGEM=https://comercial-api.midia63.com.br",
  ])("aceita %j", (bruto) => {
    expect(normalizarOrigem(bruto)?.href).toBe("https://comercial-api.midia63.com.br/");
  });

  it.each([undefined, "", "   ", "ftp://x.com", "localhost", "https://"])("recusa %j", (bruto) => {
    expect(normalizarOrigem(bruto)).toBeNull();
  });
});

describe("api: erros do servidor viram mensagem amigável", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function erroCom(res: Response) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    return (await api("/api/x").catch((e: unknown) => e)) as ApiError;
  }

  it("503 com detalhe técnico não mostra o texto técnico", async () => {
    const e = await erroCom(new Response(JSON.stringify({ detail: "API_ORIGEM inválida" }), {
      status: 503, headers: { "content-type": "application/json" },
    }));
    expect(e.message).toBe("O sistema está em manutenção. Tente de novo em alguns minutos.");
  });

  it("página de erro em texto (proxy) vira mensagem amigável", async () => {
    const e = await erroCom(new Response("MIDDLEWARE_INVOCATION_FAILED", { status: 500 }));
    expect(e.message).toBe("Algo deu errado no servidor. Tente de novo em instantes.");
  });

  it("erro 4xx da API mantém a mensagem dela", async () => {
    const e = await erroCom(new Response(JSON.stringify({ detail: "Usuário ou senha inválidos." }), {
      status: 401, headers: { "content-type": "application/json" },
    }));
    expect(e.message).toBe("Usuário ou senha inválidos.");
  });
});
