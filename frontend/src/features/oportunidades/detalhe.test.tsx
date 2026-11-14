import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { Oportunidade } from "@/api/types";
import { DetalheDialog } from "./dialogs";

const base: Oportunidade = {
  id: 1, regra: "A_LACUNA_MIX", regra_nome: "Lacuna de mix", versao_regra: "1.1", status: "suficiente",
  titulo: "Investigar reposição: Calça jeans Azul 42", acao_sugerida: "Conferir estoque físico e consultar fornecedor antes de comprar.",
  limitacao: "São 6 atendimentos, não 6 compradores únicos nem 6 vendas garantidas.",
  medicao_sugerida: "Novos registros de procura sem estoque de Calça jeans Azul 42 nos próximos 7 dias",
  explicacao: "Sugerimos isso porque 6 procuraram e não tinha.", alvo: { sku: "CJE-AZ-42" }, prioridade: 1,
  evidencias: [{ fonte: "demanda", descricao: "6 procuraram e não tinha", valor: "6", periodo_inicio: "2026-11-01", periodo_fim: "2026-11-07", amostra: 6 }],
  plano_id: null, descartada_em: null,
};

function abrir(o: Oportunidade) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <DetalheDialog oportunidade={o} onClose={vi.fn()} onCriarAcao={vi.fn()} chavePainel={["oportunidades"]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DetalheDialog (UX-07)", () => {
  it("mostra a decisão com os campos estruturados e a limitação uma vez só", () => {
    abrir({
      ...base,
      resumo: "6 registros de procura nesta janela e o saldo informado é zero.",
      numeros: [{ rotulo: "registros de procura", valor: "6" }, { rotulo: "saldo informado", valor: "0", detalhe: "contado há 20 h" }],
      passos: ["Conferir o estoque físico", "Consultar o fornecedor antes de comprar"],
      alternativas: [{ sku: "CJE-AZ-44", rotulo: "Calça jeans Azul 44", saldo: 3 }],
      acoes_disponiveis: ["criar_acao", "descartar", "adiar"],
      da_analise_vigente: true,
    });
    expect(screen.getByText("6 registros de procura nesta janela e o saldo informado é zero.")).toBeInTheDocument();
    expect(screen.getByText("registros de procura")).toBeInTheDocument();
    expect(screen.getByText("Consultar o fornecedor antes de comprar")).toBeInTheDocument();
    expect(screen.getByText(/Calça jeans Azul 44 \(3\)/)).toBeInTheDocument();
    expect(screen.getAllByText(base.limitacao)).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Lembrar depois/ })).toBeInTheDocument();
  });

  it("cartão de análise antiga (sem campos novos) continua legível e sem 'Lembrar depois'", () => {
    abrir({ ...base, da_analise_vigente: false });
    expect(screen.getByText(/O que fazer/)).toBeInTheDocument();
    expect(screen.getByText(/análise anterior/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lembrar depois/ })).not.toBeInTheDocument();
  });
});
