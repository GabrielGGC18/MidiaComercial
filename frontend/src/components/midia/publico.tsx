// PeriodosNicho · FaixaEtariaBars (Meu público v0.2)
import { CalendarDays, Clock } from "lucide-react";
import type { FaixasPublico, Periodos } from "@/api/types";
import { moeda, numero, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PeriodosNicho({ p }: { p: Periodos }) {
  const maxFase = Math.max(1, ...p.fases_mes.map((f) => Number(f.receita)));
  return (
    <div className="flex flex-col gap-5">
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Períodos mais fortes da loja">
        {p.top.map((t, i) => (
          <li key={t.periodo} className={cn("rounded-md border border-border p-3", i === 0 && "border-violeta-300 bg-violeta-50 dark:bg-violeta-900/30")}>
            <p className="sobretitulo text-muted-foreground">{i + 1}º período</p>
            <p className="mt-1 flex items-center gap-1.5 font-display font-semibold">
              <Clock className="size-4 text-violeta-500" aria-hidden /> {t.periodo}
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular">
              {moeda(t.receita)} · {pct(t.participacao)} da receita · {numero(t.pedidos)} pedidos
            </p>
          </li>
        ))}
      </ol>

      <div>
        <p className="sobretitulo mb-2 text-muted-foreground">Melhor horário por nicho</p>
        <ul className="divide-y divide-border rounded-md border border-border">
          {p.por_categoria.map((c) => (
            <li key={c.categoria} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className="font-medium">{c.categoria}</span>
              <span className="tabular">
                <strong>{c.melhor_periodo}</strong>{" "}
                <span className="text-xs text-muted-foreground">
                  {pct(c.participacao)} das unidades{c.amostra_limitada ? " · amostra pequena" : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="sobretitulo mb-2 flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden /> Fase do mês (efeito salário)
          </p>
          <ul className="flex flex-col gap-2">
            {p.fases_mes.map((f) => (
              <li key={f.fase} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-sm">
                <span className="text-muted-foreground">Dias {f.fase}</span>
                <span className="h-4 overflow-hidden bg-muted">
                  <span className="block h-full bg-violeta-500" style={{ width: `${(Number(f.receita) / maxFase) * 100}%` }} />
                </span>
                <span className="w-14 text-right text-xs font-semibold tabular">{pct(f.participacao)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="sobretitulo mb-2 text-muted-foreground">Turno</p>
          <ul className="flex flex-col gap-2">
            {p.turnos.map((t) => (
              <li key={t.turno} className="grid grid-cols-[1fr_auto] text-sm">
                <span>{t.turno}</span>
                <strong className="tabular">{pct(t.participacao)}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function FaixaEtariaBars({ f }: { f: FaixasPublico }) {
  const max = Math.max(1, ...f.faixas.map((x) => Number(x.receita)));
  return (
    <ul className="flex flex-col gap-3">
      {f.faixas.map((x) => (
        <li key={x.faixa}>
          <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-sm">
            <span className="font-semibold tabular">{x.rotulo}</span>
            <span className="h-5 overflow-hidden bg-muted">
              <span className={cn("block h-full", f.principal === x.rotulo ? "bg-violeta-700" : "bg-violeta-300")} style={{ width: `${(Number(x.receita) / max) * 100}%` }} />
            </span>
            <span className="w-14 text-right font-semibold tabular">{pct(x.participacao)}</span>
          </div>
          <p className="ml-[4.25rem] mt-0.5 text-xs text-muted-foreground">
            {x.pedidos ? `${numero(x.pedidos)} pedidos · ticket ${moeda(x.ticket_medio)}${x.categoria_preferida ? ` · prefere ${x.categoria_preferida}` : ""}` : "sem pedidos com essa faixa"}
            {x.procuras_nao_atendidas > 0 && (
              <span className="ml-1 font-medium text-coral-700 dark:text-coral-500">· {x.procuras_nao_atendidas} procuraram e não tinha</span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
