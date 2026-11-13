// EmptyState · ErrorState · PageHeader · CardSkeleton
import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FundoGrade } from "./destaques";

/** Ilustração em linhas: ondas de sinal (conceito "Mídia"). */
function Ondas() {
  return (
    <svg viewBox="0 0 120 64" className="h-16 w-28" aria-hidden fill="none" strokeLinecap="round">
      <path d="M8 40c12 0 12-16 24-16s12 16 24 16 12-16 24-16 12 16 24 16" stroke="var(--color-violeta-300)" strokeWidth="2.5" />
      <path d="M8 52c12 0 12-10 24-10s12 10 24 10 12-10 24-10 12 10 24 10" stroke="var(--color-coral-500)" strokeWidth="2.5" strokeDasharray="4 6" />
      <circle cx="60" cy="14" r="5" fill="var(--color-violeta-500)" />
    </svg>
  );
}

export function EmptyState({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-lg border border-dashed border-border bg-card/60 px-6 py-10 text-center",
        className,
      )}
    >
      <FundoGrade className="-z-10" />
      <Ondas />
      <p className="font-display text-h3 font-semibold">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>}
      {acao}
    </div>
  );
}

export function ErrorState({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-erro/30 bg-erro-bg px-6 py-8 text-center dark:bg-erro/10">
      <CircleAlert className="size-6 text-erro-tx dark:text-erro" aria-hidden />
      <p className="text-sm font-medium text-erro-tx dark:text-erro">{mensagem}</p>
      {onTentar && (
        <Button variant="secondary" size="sm" onClick={onTentar}>
          <RotateCw aria-hidden /> Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  titulo,
  subtitulo,
  acoes,
  destaque,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  /** "O que mudou?": uma frase calculada a partir dos dados já carregados (docs/08 §6). */
  destaque?: React.ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-border pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-h2 font-bold sm:text-h1">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:flex-1">{acoes}</div>}
      </div>
      {destaque && (
        <p className="mt-3 flex items-start gap-2 border-l-2 border-violeta-500 bg-violeta-50/60 px-3 py-1.5 text-[13px] dark:bg-violeta-900/25">
          <span aria-hidden className="font-bold text-violeta-500">▸</span>
          <span><span className="font-semibold">Destaque:</span> {destaque}</span>
        </p>
      )}
    </div>
  );
}

export function CardSkeleton({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-5", className)}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-5 w-2/3" />
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="mt-3 h-3 w-full" />
      ))}
    </div>
  );
}
