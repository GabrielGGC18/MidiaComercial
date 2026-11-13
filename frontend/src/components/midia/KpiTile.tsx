import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { moeda, numero, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

type Formato = "moeda" | "numero" | "pct";
const FMT: Record<Formato, (v: number) => string> = { moeda, numero, pct };

function useContagem(alvo: number, ms = 600) {
  const [v, setV] = useState(alvo);
  const anterior = useRef(0);
  useEffect(() => {
    const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return setV(alvo);
    const de = anterior.current;
    const t0 = performance.now();
    let raf = 0;
    const passo = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      setV(de + (alvo - de) * e);
      if (p < 1) raf = requestAnimationFrame(passo);
      else anterior.current = alvo;
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, ms]);
  return v;
}

/** Número-herói + período + amostra (§5.2). */
export function KpiTile({
  rotulo,
  valor,
  formato = "numero",
  periodo,
  amostra,
  nota,
  destaque,
  icone,
}: {
  rotulo: string;
  valor: number;
  formato?: Formato;
  periodo?: string;
  amostra?: string;
  nota?: string;
  destaque?: "coral" | "violeta";
  icone?: React.ReactNode;
}) {
  const animado = useContagem(valor);
  return (
    <Card className="relative overflow-hidden p-5">
      {destaque && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-1",
            destaque === "coral" ? "bg-coral-500" : "bg-violeta-500",
          )}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="overline text-muted-foreground">{rotulo}</p>
        {icone && <span className="text-muted-foreground [&_svg]:size-4">{icone}</span>}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-display font-extrabold tabular",
          destaque === "coral" && "text-coral-700 dark:text-coral-500",
        )}
        aria-label={`${rotulo}: ${FMT[formato](valor)}`}
      >
        {FMT[formato](formato === "numero" ? Math.round(animado) : animado)}
      </p>
      <p className="mt-1 text-xs font-medium text-muted-foreground">
        {[periodo, amostra].filter(Boolean).join(" · ")}
      </p>
      {nota && <p className="mt-2 text-xs text-muted-foreground">{nota}</p>}
    </Card>
  );
}
