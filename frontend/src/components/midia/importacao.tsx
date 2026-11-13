// ImportStepper · DropzoneCsv · ReconciliationBar · RejectedRowsTable
import { Check, FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Reconciliacao } from "@/api/types";
import { moeda, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const ETAPAS = ["Arquivo", "Prévia", "Confirmar"];

export function ImportStepper({ etapa }: { etapa: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Etapas da importação">
      {ETAPAS.map((nome, i) => {
        const n = i + 1;
        const feito = n < etapa;
        const atual = n === etapa;
        return (
          <li key={nome} className="flex items-center gap-2" aria-current={atual ? "step" : undefined}>
            <span
              className={cn(
                "grid size-7 place-items-center rounded-full text-xs font-bold transition-colors",
                feito && "bg-sinal-ok text-white",
                atual && "bg-primary text-primary-foreground",
                !feito && !atual && "bg-muted text-muted-foreground",
              )}
            >
              {feito ? <Check className="size-4" aria-hidden /> : n}
            </span>
            <span className={cn("font-medium", !atual && "text-muted-foreground")}>{nome}</span>
            {n < ETAPAS.length && <span aria-hidden className="mx-1 h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

export function DropzoneCsv({
  arquivo,
  onArquivo,
}: {
  arquivo: File | null;
  onArquivo: (f: File | null) => void;
}) {
  const [arrastando, setArrastando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const aceitar = (f?: File | null) => f && onArquivo(f);

  if (arquivo) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-violeta-50/60 p-4 dark:bg-violeta-900/20">
        <FileSpreadsheet className="size-8 text-violeta-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{arquivo.name}</p>
          <p className="text-xs text-muted-foreground">{(arquivo.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onArquivo(null)}
          className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Remover arquivo"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={() => setArrastando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastando(false);
        aceitar(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        arrastando
          ? "border-violeta-500 bg-violeta-50 dark:bg-violeta-900/30"
          : "border-border hover:border-violeta-300 hover:bg-muted/50",
      )}
    >
      <UploadCloud className="size-8 text-violeta-500" aria-hidden />
      <span className="font-medium">Arraste o CSV aqui ou clique para escolher</span>
      <span className="text-xs text-muted-foreground">Separador ponto e vírgula (;), UTF-8, até 5 MB</span>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => aceitar(e.target.files?.[0])}
      />
    </button>
  );
}

export function ReconciliationBar({ r }: { r: Reconciliacao }) {
  const origem = Number(r.origem);
  const importado = Number(r.importado);
  const larg = origem > 0 ? Math.min(100, (importado / origem) * 100) : 0;
  const cor = { ok: "bg-sinal-ok", atencao: "bg-sinal-atencao", alto: "bg-erro" }[r.nivel];
  const txt = {
    ok: "text-sinal-ok-tx dark:text-sinal-ok",
    atencao: "text-sinal-atencao-tx dark:text-sinal-atencao",
    alto: "text-erro-tx dark:text-erro",
  }[r.nivel];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          Importado <strong className="tabular">{moeda(importado)}</strong> · origem{" "}
          <strong className="tabular">{moeda(origem)}</strong>
        </span>
        <span className={cn("font-semibold tabular", txt)}>
          diferença {moeda(r.diferenca)} ({pct(r.percentual)})
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Importado ${pct(larg)} do total de origem`}>
        <div className={cn("h-full rounded-full transition-all duration-500", cor)} style={{ width: `${larg}%` }} />
      </div>
      {r.nivel !== "ok" && (
        <p className={cn("text-xs", txt)}>
          {r.nivel === "atencao"
            ? "Diferença pequena: confira cancelamentos e descontos no relatório de origem."
            : "Diferença alta: o arquivo pode estar incompleto ou o total de origem foi digitado errado."}
        </p>
      )}
    </div>
  );
}

export function RejectedRowsTable({
  linhas,
}: {
  linhas: { numero_linha: number; erros: { campo: string | null; mensagem: string }[] }[];
}) {
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {linhas.map((l) => (
        <li key={l.numero_linha} className="flex flex-col gap-1 px-4 py-2.5 text-sm sm:flex-row sm:gap-4">
          <span className="w-20 shrink-0 font-mono text-xs font-medium text-muted-foreground">
            Linha {l.numero_linha}
          </span>
          <span className="text-erro-tx dark:text-erro">
            {l.erros.map((e) => (e.campo ? `${e.campo}: ${e.mensagem}` : e.mensagem)).join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
