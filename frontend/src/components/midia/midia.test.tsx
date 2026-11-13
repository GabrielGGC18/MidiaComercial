import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Oportunidade, ProdutoCatalogo } from "@/api/types";
import { DemandQuickForm } from "./demanda";
import { OpportunityCard } from "./oportunidade";
import { SignalBadge } from "./sinais";

const op: Oportunidade = {
  id: 1, regra: "A_LACUNA_MIX", regra_nome: "Lacuna de mix", versao_regra: "1.0", status: "suficiente",
  titulo: "Investigar reposição: Camiseta Azul M", acao_sugerida: "Conferir estoque físico.",
  limitacao: "São 9 atendimentos, não 9 vendas.", medicao_sugerida: "", explicacao: "",
  alvo: { sku: "CAM-AZ-M" }, prioridade: 1, plano_id: null, descartada_em: null,
  evidencias: [{ fonte: "demanda", descricao: "9 procuraram e não tinha", valor: "9", periodo_inicio: "2026-11-06", periodo_fim: "2026-11-12", amostra: 9 }],
};

describe("Mídia UI", () => {
  it("SignalBadge mostra rótulo escrito, não só cor", () => {
    render(<SignalBadge status="amostra_limitada" />);
    expect(screen.getByText("Amostra limitada")).toBeInTheDocument();
  });

  it("OpportunityCard sempre exibe evidência, amostra, status e limitação", async () => {
    const criar = vi.fn();
    render(<OpportunityCard oportunidade={op} onCriarAcao={criar} onDescartar={vi.fn()} onDetalhes={vi.fn()} />);
    expect(screen.getByRole("heading", { name: op.titulo })).toBeInTheDocument();
    expect(screen.getByText("CAM-AZ-M")).toBeInTheDocument();
    expect(screen.getByText("Dados suficientes")).toBeInTheDocument();
    expect(screen.getByText(/9 registros/)).toBeInTheDocument();
    expect(screen.getByText(op.limitacao)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Criar ação/ }));
    expect(criar).toHaveBeenCalled();
  });

  it("DemandQuickForm registra em ≤ 4 toques (produto → tamanho → motivo → registrar)", async () => {
    const produto: ProdutoCatalogo = {
      id: 7, nome: "Camiseta básica", categoria: "Camisetas", tamanhos: ["P", "M", "G"], cores: ["Azul"],
      variantes: [{ sku: "CAM-AZ-M", tamanho: "M", cor: "Azul" }],
    };
    const registrar = vi.fn().mockResolvedValue({});
    render(
      <DemandQuickForm resultados={[produto]} buscando={false} onBuscar={vi.fn()} onRegistrar={registrar}
        enviando={false} ultimo={null} onDesfazer={vi.fn()} />,
    );
    const u = userEvent.setup();
    await u.click(screen.getByRole("button", { name: /Camiseta básica/ }));
    await u.click(screen.getByRole("radio", { name: "M" }));
    await u.click(screen.getByRole("radio", { name: "Sem estoque" }));
    await u.click(screen.getByRole("button", { name: "Registrar" }));
    expect(registrar).toHaveBeenCalledWith({ produto_id: 7, tamanho: "M", cor: "Azul", motivo: "indisponivel" });
  });
});
