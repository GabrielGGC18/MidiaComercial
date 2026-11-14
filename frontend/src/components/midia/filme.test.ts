import { describe, expect, it } from "vitest";
import { CENAS_FILME, cenaEm, DURACAO_FILME } from "./filme";

describe("roteiro do filme", () => {
  it("tem doze cenas em ordem, dentro da duração", () => {
    expect(CENAS_FILME).toHaveLength(12);
    CENAS_FILME.forEach((c, i) => {
      if (i) expect(c.de).toBeGreaterThan(CENAS_FILME[i - 1].de);
      expect(c.de).toBeLessThan(DURACAO_FILME);
    });
  });
  it("a cena depende só do tempo (voltar reconstrói)", () => {
    expect(cenaEm(0)).toBe(0);
    expect(cenaEm(5)).toBe(1);
    expect(cenaEm(8)).toBe(2);
    expect(cenaEm(19.9)).toBe(4);
    expect(cenaEm(40)).toBe(8);
    expect(cenaEm(60)).toBe(11);
    expect(cenaEm(5)).toBe(1);
  });
});
