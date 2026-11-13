// VozButton · PropostaCard · ContatoCard (agente: propõe, a pessoa confirma)
import { Check, ExternalLink, Mic, MicOff, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import { useState } from "react";
import type { PropostaAgente } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { MOTIVOS, rotuloFaixa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Confirmacao } from "./destaques";

export function VozButton({
  ouvindo,
  suportada,
  onIniciar,
  onParar,
  className,
}: {
  ouvindo: boolean;
  suportada: boolean;
  onIniciar: () => void;
  onParar: () => void;
  className?: string;
}) {
  if (!suportada) return null;
  return (
    <button
      type="button"
      onClick={ouvindo ? onParar : onIniciar}
      aria-pressed={ouvindo}
      aria-label={ouvindo ? "Parar de ouvir" : "Falar em vez de digitar"}
      className={cn(
        "relative grid size-14 shrink-0 place-items-center rounded-full text-white shadow-sm transition-colors",
        ouvindo ? "bg-coral-500" : "bg-violeta-500 hover:bg-violeta-600",
        className,
      )}
    >
      {ouvindo && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-coral-500/50" />}
      {ouvindo ? <MicOff className="relative size-6" /> : <Mic className="size-6" />}
    </button>
  );
}

const ROTULO_CAMPO: Record<string, string> = {
  produto: "Produto", produto_texto: "Produto", tamanho: "Tamanho", cor: "Cor", motivo: "Motivo",
  faixa_etaria: "Faixa etária", nome: "Nome", whatsapp: "WhatsApp", consentimento_contato: "Autorizou contato",
  tamanhos: "Tamanhos", categorias_interesse: "Interesses",
};

function linhas(p: PropostaAgente): [string, string][] {
  const d = p.dados as Record<string, unknown>;
  if (p.tipo === "demanda")
    return [
      ["produto", String(p.resumo.replace(/^Procurou /, "").split(" · ")[0])],
      ["motivo", MOTIVOS[String(d.motivo)] ?? String(d.motivo)],
      ["faixa_etaria", d.faixa_etaria ? `${rotuloFaixa(String(d.faixa_etaria))} (estimada)` : "—"],
    ];
  if (p.tipo === "cliente")
    return [
      ["nome", String(d.nome || "—")],
      ["whatsapp", String(d.whatsapp || "—")],
      ["faixa_etaria", d.faixa_etaria ? rotuloFaixa(String(d.faixa_etaria)) : "—"],
      ["tamanhos", ((d.tamanhos as string[]) ?? []).join(", ") || "—"],
      ["categorias_interesse", ((d.categorias_interesse as string[]) ?? []).join(", ") || "—"],
      ["consentimento_contato", d.consentimento_contato ? "Sim" : "Não"],
    ];
  return [];
}

const TITULO = { demanda: "Demanda", cliente: "Cliente", contato: "Contato" } as const;

/** Cartão de proposta (docs/01 T8): mostra o que será gravado e destaca o campo incerto. */
export function PropostaCard({
  proposta: p,
  onConfirmar,
  onRejeitar,
  ocupado,
}: {
  proposta: PropostaAgente;
  onConfirmar: () => void;
  onRejeitar: () => void;
  ocupado?: boolean;
}) {
  const incertos = new Set(p.campos_incertos.map((c) => (c === "produto_texto" ? "produto" : c)));
  const decidida = p.status !== "pendente";
  return (
    <article className="rounded-lg border border-l-[3px] border-violeta-300/60 border-l-violeta-500 bg-card p-4 shadow-sm" aria-label={`Proposta: ${p.resumo}`}>
      <header className="flex items-center justify-between gap-2">
        <p className="sobretitulo flex items-center gap-1.5 text-violeta-700 dark:text-violeta-100">
          <Sparkles className="size-3.5" aria-hidden /> {TITULO[p.tipo]}
        </p>
        {decidida && <Badge tom={p.status === "rejeitada" ? "bloqueado" : "ok"}>{p.status === "rejeitada" ? "Rejeitada" : "Gravado"}</Badge>}
      </header>
      <dl className="mt-3 grid gap-1.5 text-sm">
        {linhas(p).map(([campo, valor]) => (
          <div key={campo} className={cn("flex items-baseline justify-between gap-3 rounded-sm px-1", incertos.has(campo) && "border border-dashed border-coral-500 bg-coral-100/50 dark:bg-coral-700/15")}>
            <dt className="text-muted-foreground">{ROTULO_CAMPO[campo] ?? campo}</dt>
            <dd className="text-right font-medium">
              {valor}
              {incertos.has(campo) && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-coral-700 dark:text-coral-500">
                  <TriangleAlert className="size-3" aria-hidden /> confira
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {p.limitacao && <p className="mt-3 text-xs text-muted-foreground">{p.limitacao}</p>}
      {!decidida && (
        <div className="mt-4 flex gap-2">
          <span className="flex-1">
            <Confirmacao>
              <Button size="sm" className="w-full" onClick={onConfirmar} carregando={ocupado}>
                <Check aria-hidden /> Confirmar
              </Button>
            </Confirmacao>
          </span>
          <Button size="sm" variant="ghost" onClick={onRejeitar} disabled={ocupado}>
            <X aria-hidden /> Rejeitar
          </Button>
        </div>
      )}
    </article>
  );
}

/** Sugestão de contato do agente de vendas: motivos legíveis, mensagem editável, envio humano. */
export function ContatoCard({
  proposta: p,
  onAprovar,
  onDescartar,
  onEnviada,
  ocupado,
}: {
  proposta: PropostaAgente;
  onAprovar: (mensagem: string) => void;
  onDescartar: () => void;
  onEnviada: () => void;
  ocupado?: boolean;
}) {
  const [msg, setMsg] = useState(String(p.dados.mensagem ?? ""));
  const link = typeof p.dados.link === "string" ? p.dados.link : null;
  const c = p.cliente;
  return (
    <article className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm", p.status === "rejeitada" && "opacity-60")}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold">{c?.nome || c?.ref}</p>
          <p className="text-xs text-muted-foreground">
            {[c?.faixa_rotulo && `${c.faixa_rotulo} anos`, c?.tamanhos.length ? `veste ${c.tamanhos.join(", ")}` : null, c?.whatsapp_final && `WhatsApp ••${c.whatsapp_final}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Badge tom={{ pendente: "violeta", confirmada: "info", enviada: "ok", rejeitada: "bloqueado" }[p.status] as "violeta"}>
          {{ pendente: "Sugerido", confirmada: "Aprovado", enviada: "Enviado", rejeitada: "Descartado" }[p.status]}
        </Badge>
      </header>
      <ul className="flex flex-wrap gap-1.5" aria-label="Por que este cliente">
        {p.motivos.map((m) => (
          <li key={m} className="rounded-sm border border-violeta-300/40 bg-violeta-50 px-2 py-0.5 text-xs font-medium text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100">
            {m}
          </li>
        ))}
      </ul>
      {p.status === "pendente" ? (
        <Textarea aria-label="Mensagem" value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className="min-h-0 text-[13px]" />
      ) : (
        <p className="rounded-md bg-muted/60 p-3 text-[13px]">{String(p.dados.mensagem)}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {p.status === "pendente" && (
          <>
            <Button size="sm" onClick={() => onAprovar(msg)} carregando={ocupado}>
              <Check aria-hidden /> Aprovar mensagem
            </Button>
            <Button size="sm" variant="ghost" onClick={onDescartar} disabled={ocupado}>
              Descartar
            </Button>
          </>
        )}
        {p.status === "confirmada" && link && (
          <>
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md bg-sinal-ok-tx px-3 text-[13px] font-medium text-white hover:bg-sinal-ok-tx/85">
              <Send className="size-4" aria-hidden /> Abrir no WhatsApp <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <Button size="sm" variant="secondary" onClick={onEnviada} carregando={ocupado}>
              Marquei como enviada
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
