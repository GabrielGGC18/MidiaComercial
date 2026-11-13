// Logo · DemoRibbon · StoreSwitcher
import { Check, ChevronsUpDown, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LojaResumo } from "@/api/types";
import { PAPEL_ROTULO } from "@/lib/permissions";
import { cn } from "@/lib/utils";

/** Três barras de sinal; a terceira em coral = "o sinal que faltava" (§1). */
export function LogoIcone({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7", className)} aria-hidden>
      <rect x="2" y="12" width="5" height="10" rx="1.5" fill="var(--color-violeta-300)" />
      <rect x="9.5" y="7" width="5" height="15" rx="1.5" fill="var(--color-violeta-500)" />
      <rect x="17" y="2" width="5" height="20" rx="1.5" fill="var(--color-coral-500)" />
    </svg>
  );
}

export function Logo({ compacto, className }: { compacto?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcone />
      {!compacto && (
        <span className="font-display text-lg font-extrabold tracking-tight">
          <span className="text-violeta-500 dark:text-violeta-300">Mídia</span>
          <span className="text-foreground">Comercial</span>
        </span>
      )}
      <span className="sr-only">MidiaComercial</span>
    </span>
  );
}

export function DemoRibbon() {
  return (
    <div
      role="note"
      className="sticky top-0 z-40 flex h-7 items-center justify-center gap-2 bg-violeta-900 text-[11px] font-semibold uppercase tracking-[0.08em] text-violeta-100"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-coral-500" aria-hidden />
      Dados de demonstração
    </div>
  );
}

export function StoreSwitcher({
  lojas,
  atual,
  onTrocar,
  compacto,
}: {
  lojas: LojaResumo[];
  atual: LojaResumo | null;
  onTrocar: (id: number) => void;
  compacto?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const podeTrocar = lojas.length > 1;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => podeTrocar && setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        title={atual?.nome}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 text-left text-sm shadow-xs transition-colors",
          podeTrocar ? "hover:bg-muted" : "cursor-default",
        )}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-violeta-50 text-violeta-700 dark:bg-violeta-900/60 dark:text-violeta-100">
          <Store className="size-4" aria-hidden />
        </span>
        {!compacto && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{atual?.nome ?? "Escolher loja"}</span>
              {atual && <span className="block text-xs text-muted-foreground">{PAPEL_ROTULO[atual.papel]}</span>}
            </span>
            {podeTrocar && <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />}
          </>
        )}
      </button>
      {aberto && (
        <ul
          role="listbox"
          aria-label="Trocar de loja"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-md border border-border bg-card p-1 shadow-md animate-entrar"
        >
          {lojas.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                role="option"
                aria-selected={l.id === atual?.id}
                onClick={() => {
                  setAberto(false);
                  if (l.id !== atual?.id) onTrocar(l.id);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="flex-1">
                  <span className="block font-medium">{l.nome}</span>
                  <span className="text-xs text-muted-foreground">{PAPEL_ROTULO[l.papel]}</span>
                </span>
                {l.id === atual?.id && <Check className="size-4 text-primary" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
