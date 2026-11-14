import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelatorioAgente } from "./relatorio-agente";

describe("relatório preenchido pelo agente", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("só libera a planilha depois de preencher todas as células", () => {
    render(<RelatorioAgente />);
    const baixar = screen.getByRole("button", { name: "Baixar planilha preenchida" });
    expect(baixar).toBeDisabled();
    expect(screen.queryByText("R$ 12.800")).toBeNull();

    act(() => vi.advanceTimersByTime(15000));

    expect(baixar).toBeEnabled();
    expect(screen.getByText("R$ 12.800")).toBeInTheDocument();
    expect(screen.getByText("Início do mês")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preencher de novo/ })).toBeInTheDocument();
  });
});
