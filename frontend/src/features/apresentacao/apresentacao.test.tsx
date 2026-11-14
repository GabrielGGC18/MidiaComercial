import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApresentacaoProduto from "./ApresentacaoProduto";
import { PalcoPosVenda } from "./PalcoPosVenda";
import { inicioDe, SEGMENTOS, TOTAL_MS } from "./cenario-balcao";
import { estadoBalcao } from "./seletores-balcao";
import { DURACAO_MS, ULTIMO } from "./cenario";
import { ESCOLHAS_INICIAIS, estadoNo } from "./seletores";

describe("estado da demonstração (função pura)", () => {
  it("a venda de R$ 89,90 fecha os números do roteiro", () => {
    const antes = estadoNo("principal", 1, ESCOLHAS_INICIAIS);
    expect(antes.kpis).toEqual({ pedidos: 12, receita: 134010, ticket: 11168 });

    const depois = estadoNo("principal", 3, ESCOLHAS_INICIAIS);
    expect(depois.kpis).toEqual({ pedidos: 13, receita: 143000, ticket: 11000 });
    expect(depois.serie.reduce((s, p) => s + p.receita, 0)).toBe(143000); // série soma o mesmo total
    expect(depois.serie.find((p) => p.faixa === "16h")?.receita).toBe(30990);
    expect(depois.comprasCliente).toBe(4);
    expect(depois.estoqueBone).toBe(7);
  });

  it("visitar capítulos em qualquer ordem não duplica a venda", () => {
    const seq = [5, 0, 3, 3, 1, 5, 2].map((c) => estadoNo("principal", c, ESCOLHAS_INICIAIS));
    for (const e of seq.filter((e) => e.cap >= 2)) {
      expect(e.kpis.pedidos).toBe(13);
      expect(e.comprasCliente).toBe(4);
    }
  });

  it("revisão só vale no capítulo Revisar", () => {
    const aprovada = { ...ESCOLHAS_INICIAIS, revisao: "aprovada" as const };
    expect(estadoNo("principal", 4, aprovada).revisao).toBe("pendente");
    expect(estadoNo("principal", 5, aprovada).revisao).toBe("aprovada");
  });

  it("sem cliente: números da loja atualizam, sugestão individual não existe", () => {
    const e = estadoNo("sem-cliente", ULTIMO, ESCOLHAS_INICIAIS);
    expect(e.kpis.pedidos).toBe(13);
    expect(e.comprasCliente).toBeNull();
    expect(e.sugestoes).toHaveLength(0);
    expect(e.emRevisao).toBe(false);
  });
});

describe("palco pós-venda", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const capitulo = (nome: RegExp) => within(screen.getByRole("navigation", { name: "Capítulos" })).getByRole("button", { name: nome });

  const montar = () =>
    render(
      <MemoryRouter>
        <PalcoPosVenda />
      </MemoryRouter>,
    );

  it("avança sozinho até a revisão e espera ação explícita", async () => {
    montar();
    await act(async () => screen.getByRole("button", { name: /Ver a visão de pós-venda/ }).click());
    expect(capitulo(/Receber/)).toHaveAttribute("aria-current", "step");

    for (const ms of DURACAO_MS.slice(0, ULTIMO)) await act(async () => vi.advanceTimersByTime(ms + 10));
    expect(capitulo(/Revisar/)).toHaveAttribute("aria-current", "step");
    expect(screen.getAllByText("Aguardando sua revisão").length).toBeGreaterThan(0);

    // muito tempo depois, continua esperando: nada é aprovado sozinho
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(screen.queryByText("Sugestão revisada")).not.toBeInTheDocument();

    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await u.click(screen.getByRole("button", { name: /Aprovar sugestão/ }));
    expect(screen.getAllByText("Sugestão revisada").length).toBeGreaterThan(0);
  });

  it("pausar congela o capítulo", async () => {
    montar();
    await act(async () => screen.getByRole("button", { name: /Ver a visão de pós-venda/ }).click());
    await act(async () => screen.getByRole("button", { name: "Pausar" }).click());
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(capitulo(/Receber/)).toHaveAttribute("aria-current", "step");
  });
});

describe("balcão por voz (estado puro)", () => {
  const confirma = SEGMENTOS.find((s) => s.aguardar)!;

  it("sem confirmação nada é registrado, nem depois do tempo", () => {
    const e = estadoBalcao(TOTAL_MS, false);
    expect(e.registrado).toBe(false);
    expect(e.total).toBe(5);
    expect(e.falas.some((f) => f.id === "f-confirma")).toBe(false);
  });

  it("confirmado: 5 → 6 uma vez só, em qualquer posição depois do registro", () => {
    for (const p of [inicioDe("a-registrado"), inicioDe("a-saldo"), TOTAL_MS]) {
      expect(estadoBalcao(p, true).total).toBe(6);
    }
    expect(estadoBalcao(confirma.inicioMs - 1, true).total).toBe(5);
  });

  it("foco segue a conversa: proposta → confirmar → registro → gráfico → decisão", () => {
    expect(estadoBalcao(inicioDe("a-confere") + 10, false).foco).toBe("proposta");
    expect(estadoBalcao(confirma.inicioMs, false).foco).toBe("confirmar");
    expect(estadoBalcao(inicioDe("a-registrado"), true).foco).toBe("registro");
    expect(estadoBalcao(inicioDe("a-saldo"), true).foco).toBe("grafico");
    expect(estadoBalcao(inicioDe("a-decide"), true).foco).toBe("decisao");
  });

  it("a onda usa os picos do arquivo e o progresso da posição", () => {
    const meio = SEGMENTOS[0]!.audioMs / 2;
    const f = estadoBalcao(meio, false).falas[0]!;
    expect(f.picos.length).toBeGreaterThan(10);
    expect(f.progresso).toBeCloseTo(0.5, 1);
  });
});

describe("balcão por voz (palco)", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  const montar = () =>
    render(
      <MemoryRouter>
        <ApresentacaoProduto />
      </MemoryRouter>,
    );

  it("para na confirmação, só segue com clique, e pausar guarda a posição", async () => {
    montar();
    await act(async () => screen.getByRole("button", { name: "Assistir sem som" }).click());
    await act(async () => vi.advanceTimersByTime(SEGMENTOS.find((s) => s.aguardar)!.inicioMs + 5_000));
    const confirmar = screen.getByRole("button", { name: /Confirmar registro/ });
    expect(screen.queryByText("Registrado")).not.toBeInTheDocument();

    await act(async () => confirmar.click());
    await act(async () => vi.advanceTimersByTime(3_000));
    await act(async () => screen.getByRole("button", { name: "Pausar" }).click());
    const fala = screen.getByText("Isso, pode registrar.");
    expect(fala).toBeInTheDocument();
    // pausado: nada avança
    const antes = screen.queryAllByText(/Registrado/).length;
    await act(async () => vi.advanceTimersByTime(20_000));
    expect(screen.queryAllByText(/Registrado/).length).toBe(antes);

    await act(async () => screen.getByRole("button", { name: "Continuar" }).click());
    await act(async () => vi.advanceTimersByTime(TOTAL_MS));
    expect(screen.getByText("Repor calça jeans azul 42?")).toBeInTheDocument();
  });
});
