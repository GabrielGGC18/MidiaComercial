// Mensagem de voz: onda feita dos picos REAIS do arquivo (scripts/gerar-audio-percurso.py),
// progresso = posição do relógio dentro do áudio. Nada aleatório.
import { cn } from "@/lib/utils";

const mmss = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function OndaAudio({ picos, progresso, className }: { picos: readonly number[]; progresso: number; className?: string }) {
  const n = picos.length;
  return (
    <span className={cn("flex h-7 flex-1 items-center gap-[2px]", className)} aria-hidden>
      {picos.map((p, i) => (
        <span
          key={i}
          className={cn("w-[3px] shrink-0 rounded-full transition-colors duration-100", i / n < progresso ? "bg-current" : "bg-current/25")}
          style={{ height: `${Math.max(12, p * 100)}%` }}
        />
      ))}
    </span>
  );
}

export function AudioMensagem({
  picos,
  progresso,
  duracaoMs,
  tocando,
}: {
  picos: readonly number[];
  progresso: number;
  duracaoMs: number;
  tocando: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-current/15")}
        aria-hidden
      >
        {tocando ? (
          <span className="flex h-3 items-end gap-[2px]">
            <span className="w-[2px] animate-pulse rounded-full bg-current" style={{ height: "60%" }} />
            <span className="w-[2px] animate-pulse rounded-full bg-current [animation-delay:150ms]" style={{ height: "100%" }} />
            <span className="w-[2px] animate-pulse rounded-full bg-current [animation-delay:300ms]" style={{ height: "40%" }} />
          </span>
        ) : (
          <span className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
        )}
      </span>
      <OndaAudio picos={picos} progresso={progresso} />
      <span className="shrink-0 font-mono text-[11px] tabular opacity-80">
        {tocando ? mmss(progresso * duracaoMs) : mmss(duracaoMs)}
      </span>
    </span>
  );
}
