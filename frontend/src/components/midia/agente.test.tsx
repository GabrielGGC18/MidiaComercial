import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropostaAgente } from "@/api/types";
import { ContatoCard, PropostaCard, VozButton } from "./agente";

const base: PropostaAgente = {
  id: 1, tipo: "demanda", status: "pendente", resumo: "Procurou Calça jeans Azul 42 · sem estoque",
  dados: { motivo: "indisponivel", faixa_etaria: "35_44" }, campos_incertos: ["tamanho"], motivos: [],
  limitacao: "Confira antes de confirmar.", pontuacao: 0, campanha_id: null, cliente: null,
  criado_em: "2026-11-13T10:00:00-03:00", decidido_em: null, enviado_em: null, objeto_criado: "",
};

describe("Agente", () => {
  it("PropostaCard mostra o que será gravado, a faixa estimada e só grava ao confirmar", async () => {
    const confirmar = vi.fn();
    render(<PropostaCard proposta={base} onConfirmar={confirmar} onRejeitar={vi.fn()} />);
    expect(screen.getByText("35–44 (estimada)")).toBeInTheDocument();
    expect(screen.getByText("Sem estoque")).toBeInTheDocument();
    expect(confirmar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Confirmar/ }));
    expect(confirmar).toHaveBeenCalledOnce();
  });

  it("campo incerto é destacado com 'confira'", () => {
    render(<PropostaCard proposta={{ ...base, campos_incertos: ["motivo"] }} onConfirmar={vi.fn()} onRejeitar={vi.fn()} />);
    expect(screen.getByText(/confira/)).toBeInTheDocument();
  });

  it("ContatoCard explica o porquê, permite editar e só mostra WhatsApp depois de aprovado", async () => {
    const aprovar = vi.fn();
    const contato: PropostaAgente = {
      ...base, tipo: "contato", motivos: ["Já comprou Camisas (3 un.)", "Veste G (tem em estoque)"],
      dados: { mensagem: "Oi, Lucas! (Responda SAIR para não receber mensagens.)" },
      cliente: { id: 9, nome: "Lucas Moura", ref: "C-1", faixa_rotulo: "35–44", tamanhos: ["G"], whatsapp_final: "0012" },
    };
    const { rerender } = render(<ContatoCard proposta={contato} onAprovar={aprovar} onDescartar={vi.fn()} onEnviada={vi.fn()} />);
    expect(screen.getByText("Já comprou Camisas (3 un.)")).toBeInTheDocument();
    expect(screen.queryByText(/Abrir no WhatsApp/)).not.toBeInTheDocument();
    const caixa = screen.getByRole("textbox", { name: "Mensagem" });
    await userEvent.type(caixa, " Até!");
    await userEvent.click(screen.getByRole("button", { name: /Aprovar/ }));
    expect(aprovar.mock.calls[0][0]).toContain("Até!");
    rerender(
      <ContatoCard proposta={{ ...contato, status: "confirmada", dados: { ...contato.dados, link: "https://wa.me/55" } }}
        onAprovar={aprovar} onDescartar={vi.fn()} onEnviada={vi.fn()} />,
    );
    expect(screen.getByRole("link", { name: /Abrir no WhatsApp/ })).toHaveAttribute("href", "https://wa.me/55");
  });

  it("sem suporte a voz, o botão de microfone não aparece (teclado continua)", () => {
    const { container } = render(<VozButton ouvindo={false} suportada={false} onIniciar={vi.fn()} onParar={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
