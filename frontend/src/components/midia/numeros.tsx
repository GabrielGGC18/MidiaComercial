// Números animados de domínio (CountUp com formatação pt-BR). Features usam daqui (docs/08 §4.2).
import { CountUp as Base } from "@/components/efeitos/CountUp";
import { numero } from "@/lib/format";

export function CountUp({ para, formatar = (v: number) => numero(Math.round(v)) }: { para: number; formatar?: (v: number) => string }) {
  return <Base para={para} formatar={formatar} />;
}
