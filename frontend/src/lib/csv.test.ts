import { describe, expect, it } from "vitest";
import { montarCsv } from "./csv";

describe("montarCsv", () => {
  it("usa ponto e vírgula e protege aspas, quebras e separador", () => {
    expect(montarCsv([["Indicador", "Valor"], ["Receita", 12800], ['Calça "jeans"; azul', null]])).toBe('Indicador;Valor\r\nReceita;12800\r\n"Calça ""jeans""; azul";');
  });
  it("texto que começa como fórmula não vira fórmula", () => {
    expect(montarCsv([["=SOMA(A1)", -5]])).toBe("'=SOMA(A1);-5");
  });
});
