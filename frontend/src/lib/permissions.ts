// Guard só organiza a navegação; a autorização real está no backend (FRONTEND.md §6.2)
export type Papel = "atendente" | "gerente" | "dono";

const NIVEL: Record<Papel, number> = { atendente: 1, gerente: 2, dono: 3 };

export function temPapel(papel: string | null | undefined, minimo: Papel) {
  return !!papel && (NIVEL[papel as Papel] ?? 0) >= NIVEL[minimo];
}

export const rotaInicial = (papel: string | null | undefined) =>
  temPapel(papel, "gerente") ? "/oportunidades" : "/balcao";

export const PAPEL_ROTULO: Record<string, string> = {
  atendente: "Atendente",
  gerente: "Gerente",
  dono: "Dono",
};
