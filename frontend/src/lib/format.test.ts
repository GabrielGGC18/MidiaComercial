import { moeda, periodo, pct } from "./format";
import { rotaInicial, temPapel } from "./permissions";

it("formata no padrão brasileiro", () => {
  expect(moeda(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
  expect(pct(41.5)).toBe("41,5%");
  expect(periodo("2026-11-06", "2026-11-12")).toBe("06–12/11");
  expect(periodo("2026-10-28", "2026-11-03")).toBe("28/10–03/11");
  expect(periodo("2026-11-13", "2026-11-13")).toBe("13/11"); // não "13–13/11"
  expect(periodo("2025-11-20", "2026-11-03")).toBe("20/11–03/11"); // mesmo mês, anos diferentes
});

it("hierarquia de papéis", () => {
  expect(temPapel("dono", "gerente")).toBe(true);
  expect(temPapel("atendente", "gerente")).toBe(false);
  expect(temPapel(null, "atendente")).toBe(false);
});

it("rota inicial depois do login: painel do gerente ou balcão; a raiz é a página pública", () => {
  expect(rotaInicial("gerente")).toBe("/oportunidades");
  expect(rotaInicial("dono")).toBe("/oportunidades");
  expect(rotaInicial("atendente")).toBe("/balcao");
});
