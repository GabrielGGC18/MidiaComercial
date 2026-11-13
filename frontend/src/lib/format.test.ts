import { moeda, periodo, pct } from "./format";
import { temPapel } from "./permissions";

it("formata no padrão brasileiro", () => {
  expect(moeda(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50");
  expect(pct(41.5)).toBe("41,5%");
  expect(periodo("2026-11-06", "2026-11-12")).toBe("06–12/11");
  expect(periodo("2026-10-28", "2026-11-03")).toBe("28/10–03/11");
});

it("hierarquia de papéis", () => {
  expect(temPapel("dono", "gerente")).toBe(true);
  expect(temPapel("atendente", "gerente")).toBe(false);
  expect(temPapel(null, "atendente")).toBe(false);
});
