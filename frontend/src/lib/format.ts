// Números, moeda e datas no padrão brasileiro (FRONTEND.md §2)
import { addDays, format, formatDistanceToNowStrict, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numFmt = new Intl.NumberFormat("pt-BR");
const pctFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type Num = number | string | null | undefined;
const n = (v: Num) => (v === null || v === undefined || v === "" ? 0 : Number(v));

export const moeda = (v: Num) => moedaFmt.format(n(v));
export const numero = (v: Num) => numFmt.format(n(v));
export const pct = (v: Num) => `${pctFmt.format(n(v))}%`;

const asDate = (d: string | Date) => (typeof d === "string" ? parseISO(d) : d);

export const data = (d: string | Date) => format(asDate(d), "dd/MM", { locale: ptBR });
export const dataLonga = (d: string | Date) => format(asDate(d), "dd/MM/yyyy", { locale: ptBR });
export const dataHora = (d: string | Date) => format(asDate(d), "dd/MM 'às' HH:mm", { locale: ptBR });
export const hora = (d: string | Date) => format(asDate(d), "HH:mm", { locale: ptBR });
export const relativo = (d: string | Date) =>
  formatDistanceToNowStrict(asDate(d), { locale: ptBR, addSuffix: true });

/** "06–12/11" ou "28/10–03/11" */
export function periodo(ini: string, fim: string) {
  const a = asDate(ini);
  const b = asDate(fim);
  if (format(a, "MM") === format(b, "MM")) return `${format(a, "dd")}–${format(b, "dd/MM")}`;
  return `${format(a, "dd/MM")}–${format(b, "dd/MM")}`;
}

export const isoHoje = () => format(new Date(), "yyyy-MM-dd");
export const isoDaqui = (dias: number) => format(addDays(new Date(), dias), "yyyy-MM-dd");

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export const MOTIVOS: Record<string, string> = {
  indisponivel: "Sem estoque",
  variacao_ausente: "Sem tamanho/cor",
  preco: "Preço",
  prazo: "Prazo",
  outro: "Outro",
};

export const FAIXAS: { valor: "ate_17" | "18_24" | "25_34" | "35_44" | "45_59" | "60_mais"; rotulo: string }[] = [
  { valor: "ate_17", rotulo: "Até 17" },
  { valor: "18_24", rotulo: "18–24" },
  { valor: "25_34", rotulo: "25–34" },
  { valor: "35_44", rotulo: "35–44" },
  { valor: "45_59", rotulo: "45–59" },
  { valor: "60_mais", rotulo: "60+" },
];
export const rotuloFaixa = (f?: string | null) => FAIXAS.find((x) => x.valor === f)?.rotulo ?? "";
