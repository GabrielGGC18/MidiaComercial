// Logo (monograma MC) · DemoRibbon · StoreSwitcher
// Identidade: docs/logo-01-monograma-mc.md. Roxo #6D4AFF, verde neon #B6FF3B, assinatura "MIDIA | Comercial".
import { Check, ChevronsUpDown, Store } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { LojaResumo } from "@/api/types";
import { useMenosMovimento } from "@/lib/movimento";
import { PAPEL_ROTULO } from "@/lib/permissions";
import { cn } from "@/lib/utils";

// Desenho oficial do símbolo (mc-simbolo-*.svg), recortado na caixa do monograma (sem a margem do arquivo)
const CAIXA = "4 18 68 44";
const LETRA_M = "M6 60V20L24 38 42 20V60H31V45L24 52 17 45V60Z";
const LETRA_C = "M70 20H54L44 30V50L54 60H70V49H59L55 45V35L59 31H70Z";
const ABERTURA = "M54 20H70V31H59L54 36Z";

/** Monograma MC: M e C em roxo, com a abertura do C em verde neon. `mono` usa a cor do texto. */
export function LogoIcone({ className, mono = false, animado = false }: { className?: string; mono?: boolean; animado?: boolean }) {
  const roxo = mono ? "currentColor" : "var(--color-violeta-500)";
  return (
    <svg viewBox={CAIXA} className={cn("h-6 w-auto shrink-0 overflow-visible", className)} aria-hidden>
      <path className={animado ? "logo-letra" : undefined} fill={roxo} d={LETRA_M} />
      <path className={animado ? "logo-letra logo-letra-2" : undefined} fill={roxo} d={LETRA_C} />
      <path className={animado ? "logo-neon" : undefined} fill={mono ? "currentColor" : "var(--color-neon-500)"} d={ABERTURA} />
    </svg>
  );
}

/** Assinatura "MIDIA | Comercial": Comercial em neon no escuro e em tinta no claro, para manter a leitura. */
function NomeMarca({ sobreEscuro = false, className }: { sobreEscuro?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap font-display font-extrabold leading-none tracking-tight", className)} aria-hidden>
      <span className="text-violeta-500">MIDIA</span>
      <span className={cn("mx-[0.32em] h-[0.95em] w-px", sobreEscuro ? "bg-white/30" : "bg-tinta-900/30 dark:bg-white/30")} />
      <span className={cn("text-[0.8em]", sobreEscuro ? "text-neon-500" : "text-tinta-900 dark:text-neon-500")}>Comercial</span>
    </span>
  );
}

export function Logo({ compacto, className }: { compacto?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIcone />
      {!compacto && <NomeMarca className="text-lg" />}
      <span className="sr-only">MidiaComercial</span>
    </span>
  );
}

/**
 * Logo de abertura (página pública, login, apresentação): o M e o C sobem em sequência, a abertura neon
 * "acende" e o nome é revelado da esquerda para a direita. Com movimento reduzido, mostra a logo estática.
 */
export function LogoAnimado({
  className,
  compacto,
  sobreEscuro = false,
  classeNome,
}: {
  className?: string;
  compacto?: boolean;
  /** força as cores de fundo escuro (nav escura sobre qualquer tema) */
  sobreEscuro?: boolean;
  /** classes extras do nome (ex.: esconder em tela muito estreita) */
  classeNome?: string;
}) {
  const menos = useMenosMovimento();
  return (
    <span className={cn("inline-flex items-center", compacto ? "gap-2.5" : "gap-3.5", className)}>
      <LogoIcone animado={!menos} className={compacto ? "h-7" : "h-10 sm:h-12"} />
      <NomeMarca
        sobreEscuro={sobreEscuro}
        className={cn(compacto ? "text-base sm:text-xl" : "text-2xl sm:text-3xl", !menos && "logo-nome-revela", classeNome)}
      />
      <span className="sr-only">MidiaComercial</span>
    </span>
  );
}

export function DemoRibbon() {
  return (
    <div
      role="note"
      className="sticky top-0 z-nav flex h-7 items-center justify-center gap-2 bg-violeta-900 text-[11px] font-semibold uppercase tracking-[0.08em] text-violeta-100"
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
          className="absolute bottom-full left-0 z-sobre mb-2 w-64 rounded-md border border-border bg-card p-1 shadow-md animate-entrar"
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
