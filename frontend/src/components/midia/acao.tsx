// ActionCard · BeforeAfter
import { ArrowRight, CalendarClock, Info, User } from "lucide-react";
import type { Medicao, Plano } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { dataLonga, numero, periodo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BeforeAfter({ medicao, unidade }: { medicao?: Medicao | null; unidade?: string }) {
  if (!medicao) {
    return <p className="text-[13px] text-muted-foreground">Sem medição ainda.</p>;
  }
  const antes = Number(medicao.valor_antes);
  const depois = medicao.valor_depois === null ? null : Number(medicao.valor_depois);
  const delta = depois === null ? null : depois - antes;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md bg-muted/60 p-3">
      <div>
        <p className="overline text-muted-foreground">Antes · {periodo(medicao.periodo_antes_inicio, medicao.periodo_antes_fim)}</p>
        <p className="font-display text-h2 font-bold tabular">{numero(antes)}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
      <div>
        <p className="overline text-muted-foreground">Depois · {periodo(medicao.periodo_depois_inicio, medicao.periodo_depois_fim)}</p>
        <p className="font-display text-h2 font-bold tabular">
          {depois === null ? "—" : numero(depois)}
          {delta !== null && delta !== 0 && (
            <span className={cn("ml-2 text-sm font-semibold", delta < 0 ? "text-sinal-ok-tx dark:text-sinal-ok" : "text-muted-foreground")}>
              {delta > 0 ? "+" : ""}
              {numero(delta)}
            </span>
          )}
        </p>
      </div>
      {unidade && <p className="col-span-3 text-xs text-muted-foreground">{unidade}</p>}
    </div>
  );
}

export function AvisoAssociacao({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      Comparação antes/depois mostra associação, não prova efeito.
    </p>
  );
}

const SITUACAO = {
  aberta: { rotulo: "Aberta", tom: "violeta" },
  concluida: { rotulo: "Concluída", tom: "ok" },
  descartada: { rotulo: "Descartada", tom: "bloqueado" },
} as const;

export function ActionCard({ acao, rodape }: { acao: Plano; rodape?: React.ReactNode }) {
  const s = SITUACAO[acao.situacao];
  return (
    <article className="flex animate-entrar flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold leading-snug">{acao.titulo}</h3>
        <Badge tom={s.tom}>{s.rotulo}</Badge>
      </header>
      <dl className="grid gap-1.5 text-[13px]">
        <div className="flex items-center gap-2">
          <User className="size-3.5 text-muted-foreground" aria-hidden />
          <dt className="sr-only">Responsável</dt>
          <dd>{acao.responsavel}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-3.5 text-muted-foreground" aria-hidden />
          <dt className="sr-only">Prazo</dt>
          <dd className={cn(acao.atrasado && "font-semibold text-erro-tx dark:text-erro")}>
            Prazo {dataLonga(acao.prazo)} {acao.atrasado && "· atrasada"}
          </dd>
        </div>
        <div>
          <dt className="overline mt-1 text-muted-foreground">Indicador</dt>
          <dd>{acao.indicador}</dd>
        </div>
      </dl>
      <BeforeAfter medicao={acao.medicoes[0]} />
      {acao.justificativa && (
        <p className="text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">Justificativa:</span> {acao.justificativa}
        </p>
      )}
      {rodape}
    </article>
  );
}
