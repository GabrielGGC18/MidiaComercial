import { render, screen } from "@testing-library/react";
import { CountUp } from "./CountUp";
import { RotatingText } from "./RotatingText";
import { ShinyText } from "./ShinyText";
import { StarBorder } from "./StarBorder";

function menosMovimento(ligado: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: ligado && q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

describe("Efeitos respeitam prefers-reduced-motion (docs/08 §8)", () => {
  it("CountUp mostra o valor final direto", () => {
    menosMovimento(true);
    render(<CountUp para={1234} formatar={(v) => `n=${Math.round(v)}`} />);
    expect(screen.getByText("n=1234")).toBeInTheDocument();
  });

  it("ShinyText e StarBorder ficam sem animação", () => {
    menosMovimento(true);
    const { container } = render(
      <>
        <ShinyText>Agente pensando…</ShinyText>
        <StarBorder><button>Buscar</button></StarBorder>
      </>,
    );
    expect(screen.getByRole("status")).not.toHaveClass("efeito-brilho");
    expect(container.querySelector(".efeito-giro")).toBeNull();
  });

  it("com movimento liberado, o texto continua legível (status)", () => {
    menosMovimento(false);
    render(<ShinyText>Processando…</ShinyText>);
    expect(screen.getByRole("status")).toHaveTextContent("Processando…");
  });

  it("RotatingText mostra frase estática quando há menos movimento", () => {
    menosMovimento(true);
    const { container } = render(<RotatingText frases={["o que vendeu", "o que faltou", "o que parou", "quem voltou"]} />);
    expect(screen.getByText("o que vendeu")).toBeInTheDocument();
    expect(container.querySelectorAll(".efeito-texto-rotativo-item")).toHaveLength(0);
    expect(container).not.toHaveTextContent("o que faltou");
  });

  it("RotatingText aplica classeItem em cada frase (gradiente no elemento que anima)", () => {
    menosMovimento(false);
    const { container } = render(
      <RotatingText frases={["a", "b", "c", "d"]} classeItem="efeito-texto-gradiente" />,
    );
    const itens = container.querySelectorAll(".efeito-texto-rotativo-item");
    expect(itens).toHaveLength(4);
    itens.forEach((el) => expect(el).toHaveClass("efeito-texto-gradiente"));
    expect(container.firstElementChild).not.toHaveClass("efeito-texto-gradiente");
  });
});
