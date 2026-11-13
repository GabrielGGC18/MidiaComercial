// EvidenceList · OpportunityCard · BlockedRuleRow (§5.3)
import { ArrowRight, CheckCircle2, Lock, Plus } from "lucide-react";
import type { Bloqueio, Evidencia, Oportunidade } from "@/api/types";
import { Button } from "@/components/ui/button";
import { numero, periodo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CartaoExploravel } from "./destaques";
import { corBordaStatus, LimitationNote, SignalBadge, SourceChip } from "./sinais";

export function EvidenceList({ evidencias }: { evidencias: Evidencia[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {evidencias.map((e, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <SourceChip fonte={e.fonte} />
          <span className="font-medium">{e.descricao}</span>
          <span className="text-xs text-muted-foreground tabular">
            · {periodo(e.periodo_inicio, e.periodo_fim)} · {numero(e.amostra)}{" "}
            {e.amostra === 1 ? "registro" : "registros"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Barras({ nivel }: { nivel: number }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-sm",
            ["h-1.5", "h-2.5", "h-3.5"][i],
            i < nivel ? (i === 2 ? "bg-coral-500" : "bg-violeta-500") : "bg-tinta-200 dark:bg-tinta-700",
          )}
        />
      ))}
    </span>
  );
}

export function OpportunityCard({
  oportunidade: o,
  onCriarAcao,
  onDescartar,
  onDetalhes,
  indice = 0,
  total,
}: {
  oportunidade: Oportunidade;
  onCriarAcao: () => void;
  onDescartar: () => void;
  onDetalhes: () => void;
  indice?: number;
  total?: number;
}) {
  const sku = typeof o.alvo.sku === "string" ? o.alvo.sku : null;
  return (
    <CartaoExploravel
      role="article"
      aria-labelledby={`op-${o.id}`}
      style={{ animationDelay: `${indice * 60}ms` }}
      className={cn(
        "animate-entrar rounded-lg border border-l-[3px] border-border bg-card p-5 shadow-sm transition-shadow duration-150 hover:shadow-md",
        corBordaStatus[o.status],
      )}
    >
      {total && (
        <span aria-hidden className="absolute right-4 top-3 font-display text-h1 font-extrabold leading-none text-tinta-200 tabular dark:text-tinta-800">
          {o.prioridade}
          <span className="text-sm font-bold">/{total}</span>
        </span>
      )}
      <header className="flex flex-wrap items-center justify-between gap-2 pr-14">
        <p className="sobretitulo flex items-center gap-2 text-muted-foreground">
          <span className="grid size-5 place-items-center rounded-sm bg-violeta-50 text-[11px] font-bold text-violeta-700 dark:bg-violeta-900/60 dark:text-violeta-100">
            {o.prioridade}
          </span>
          <Barras nivel={4 - Math.min(3, o.prioridade)} />
          {o.regra_nome}
        </p>
        <SignalBadge status={o.status} />
      </header>

      <h3 id={`op-${o.id}`} className="mt-3 font-display text-h3 font-semibold">
        {o.titulo}
      </h3>
      {sku && <p className="font-mono text-xs font-medium text-muted-foreground">{sku}</p>}

      <p className="sobretitulo mt-4 mb-2 text-muted-foreground">Evidência</p>
      <EvidenceList evidencias={o.evidencias} />

      <LimitationNote texto={o.limitacao} className="mt-4" />

      <p className="mt-4 text-sm">
        <span className="font-semibold">Sugestão:</span> {o.acao_sugerida}
      </p>

      <footer className="mt-5 flex flex-wrap items-center gap-2">
        {o.plano_id ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sinal-ok-tx dark:text-sinal-ok">
            <CheckCircle2 className="size-4" aria-hidden /> Ação criada
          </span>
        ) : (
          <Button size="sm" onClick={onCriarAcao}>
            <Plus aria-hidden /> Criar ação
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={onDetalhes}>
          Ver detalhes <ArrowRight aria-hidden />
        </Button>
        {!o.plano_id && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={onDescartar}>
            Descartar
          </Button>
        )}
      </footer>
    </CartaoExploravel>
  );
}

export function BlockedRuleRow({ bloqueio }: { bloqueio: Bloqueio }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-tinta-300 bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:gap-3 dark:border-tinta-700">
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-sinal-bloqueado-tx dark:text-tinta-300">
        <Lock className="size-4" aria-hidden />
        {bloqueio.nome}: bloqueada
      </span>
      <span className="text-[13px] text-muted-foreground">{bloqueio.motivo}</span>
      {bloqueio.como_liberar && (
        <span className="text-[13px] text-foreground sm:ml-auto sm:text-right">
          <span className="font-medium">Como liberar:</span> {bloqueio.como_liberar}
        </span>
      )}
    </div>
  );
}
