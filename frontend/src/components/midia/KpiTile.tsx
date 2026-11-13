import { CountUp } from "@/components/efeitos/CountUp";
import { SpotlightCard } from "@/components/efeitos/SpotlightCard";
import { moeda, numero, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Formato = "moeda" | "numero" | "pct";
const FMT: Record<Formato, (v: number) => string> = { moeda, numero, pct: (v) => pct(v) };

/** Número-herói + período + amostra (§5.2). `embutido` = dentro de um KpiBloco com divisórias. */
export function KpiTile({
  rotulo,
  valor,
  formato = "numero",
  periodo,
  amostra,
  nota,
  destaque,
  icone,
  embutido,
}: {
  rotulo: string;
  valor: number;
  formato?: Formato;
  periodo?: string;
  amostra?: string;
  nota?: string;
  destaque?: "coral" | "violeta";
  icone?: React.ReactNode;
  embutido?: boolean;
}) {
  const fmt = (v: number) => FMT[formato](formato === "numero" ? Math.round(v) : v);
  return (
    <SpotlightCard
      cor={destaque === "coral" ? "var(--color-coral-500)" : "var(--color-violeta-500)"}
      className={cn("p-5", !embutido && "rounded-lg border border-border bg-card shadow-sm")}
    >
      {destaque && (
        <span aria-hidden className={cn("absolute inset-x-0 top-0 h-0.5", destaque === "coral" ? "bg-coral-500" : "bg-violeta-500")} />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="sobretitulo text-muted-foreground">{rotulo}</p>
        {icone && <span className="text-muted-foreground [&_svg]:size-4">{icone}</span>}
      </div>
      <p
        className={cn(
          "mt-2 whitespace-nowrap font-display text-[clamp(1.5rem,2.3vw,2.25rem)] font-extrabold leading-tight tabular",
          destaque === "coral" && "text-coral-700 dark:text-coral-500",
        )}
        aria-label={`${rotulo}: ${fmt(valor)}`}
      >
        <CountUp para={valor} formatar={fmt} />
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">{[periodo, amostra].filter(Boolean).join(" · ")}</p>
      {nota && <p className="mt-2 text-xs text-muted-foreground">{nota}</p>}
    </SpotlightCard>
  );
}

/** KPIs num bloco único com divisórias no desktop (cara de painel); cards soltos no celular. */
export function KpiBloco({ children, colunas = 4 }: { children: React.ReactNode; colunas?: 3 | 4 }) {
  return (
    <section
      aria-label="Indicadores"
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-border lg:rounded-lg lg:border lg:border-border lg:bg-card lg:shadow-sm",
        "max-lg:[&>*]:rounded-lg max-lg:[&>*]:border max-lg:[&>*]:border-border max-lg:[&>*]:bg-card max-lg:[&>*]:shadow-sm",
        colunas === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
      )}
    >
      {children}
    </section>
  );
}
