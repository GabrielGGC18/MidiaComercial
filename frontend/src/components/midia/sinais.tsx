// SignalBadge · SourceChip · LimitationNote · CoverageNote
import { Boxes, Info, Lock, Receipt, SignalHigh, SignalMedium, Store, TriangleAlert, Users } from "lucide-react";
import type { Fonte, StatusDados } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS = {
  suficiente: { rotulo: "Dados confiáveis", tom: "ok", Icone: SignalHigh, dica: "Há registros suficientes e o estoque está dentro do prazo da loja." },
  amostra_limitada: { rotulo: "Confira antes de agir", tom: "atencao", Icone: SignalMedium, dica: "Poucos registros ou estoque desatualizado: trate como pista." },
  bloqueada: { rotulo: "Cálculo bloqueado", tom: "bloqueado", Icone: Lock, dica: "Falta dado para calcular." },
} as const;

export const corBordaStatus: Record<StatusDados, string> = {
  suficiente: "border-l-sinal-ok",
  amostra_limitada: "border-l-sinal-atencao",
  bloqueada: "border-l-sinal-bloqueado",
};

/** Status nunca depende só da cor: ícone + rótulo escrito (§4.2). */
export function SignalBadge({ status, motivo }: { status: StatusDados; motivo?: string | null }) {
  const s = STATUS[status];
  return (
    <Badge tom={s.tom} title={motivo ?? s.dica}>
      <s.Icone aria-hidden />
      {s.rotulo}
    </Badge>
  );
}

const FONTES: Record<Fonte, { rotulo: string; Icone: typeof Store; cls: string }> = {
  demanda: { rotulo: "Balcão", Icone: Store, cls: "bg-coral-100 text-coral-700 dark:bg-coral-700/25 dark:text-coral-100" },
  estoque: { rotulo: "Estoque", Icone: Boxes, cls: "bg-turquesa/12 text-turquesa-tx dark:text-turquesa" },
  vendas: { rotulo: "Vendas", Icone: Receipt, cls: "bg-violeta-50 text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100" },
  acao: { rotulo: "Ação", Icone: Users, cls: "bg-info-bg text-info-tx dark:bg-info/15 dark:text-info" },
};

/** Nome da fonte em palavras de loja ("demanda" → "Balcão"). */
export const rotuloFonte = (fonte: Fonte) => FONTES[fonte]?.rotulo ?? fonte;

export function SourceChip({ fonte }: { fonte: Fonte }) {
  const f = FONTES[fonte];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-sm border border-current/15 px-2 py-0.5 text-xs font-semibold", f.cls)}>
      <f.Icone className="size-3.5" aria-hidden />
      {f.rotulo}
    </span>
  );
}

/** Faixa de limitação, sempre visível (princípio 2). */
export function LimitationNote({ texto, className }: { texto: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex gap-2 rounded-r-md border-l-[3px] border-sinal-atencao bg-sinal-atencao-bg/60 px-3 py-2 text-[13px] text-sinal-atencao-tx dark:bg-sinal-atencao/10 dark:text-sinal-atencao",
        className,
      )}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        <span className="sr-only">Limitação: </span>
        {texto}
      </p>
    </div>
  );
}

export function CoverageNote({ percentual, identificados, total }: { percentual: string | number; identificados: number; total: number }) {
  const semRef = 100 - Number(percentual);
  return (
    <p className="flex gap-2 rounded-md bg-info-bg px-3 py-2 text-[13px] text-info-tx dark:bg-info/10 dark:text-info">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {pct(percentual)} dos pedidos têm cliente identificado ({identificados} de {total}).{" "}
        {semRef > 0 && <>A leitura de recorrência vale só para esse grupo.</>}
      </span>
    </p>
  );
}
