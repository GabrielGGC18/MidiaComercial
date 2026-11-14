import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CelularAnuncio } from "./celular-anuncio";
import { PesquisaSecao } from "./pesquisa";

describe("seção da pesquisa", () => {
  it("mostra os sistemas citados sem prometer conexão direta", () => {
    render(<PesquisaSecao />);
    expect(screen.getByRole("heading", { name: /Fomos ao shopping/ })).toBeInTheDocument();
    expect(screen.getAllByText("SETA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("UNIX").length).toBeGreaterThan(0);
    expect(screen.getByText(/conexão direta com cada sistema entra depois de testada/)).toBeInTheDocument();
  });

  it("o anúncio do celular (hero) pode ser pausado", async () => {
    render(<CelularAnuncio />);
    await userEvent.click(screen.getByRole("button", { name: "Pausar o anúncio" }));
    expect(screen.getByRole("button", { name: "Continuar o anúncio" })).toBeInTheDocument();
  });
});
