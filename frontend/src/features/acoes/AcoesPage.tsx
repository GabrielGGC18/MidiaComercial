import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Plano, Situacao } from "@/api/types";
import { ActionCard, AvisoAssociacao } from "@/components/midia/acao";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NovaAcaoDialog } from "./dialogs";

const COLUNAS: { s: Situacao; rotulo: string }[] = [
  { s: "aberta", rotulo: "Abertas" },
  { s: "concluida", rotulo: "Concluídas" },
  { s: "descartada", rotulo: "Descartadas" },
];

export default function AcoesPage() {
  const chave = useChaveLoja("acoes", "lista");
  const q = useQuery({ queryKey: chave, queryFn: () => api<Plano[]>("/api/acoes/") });
  const [params, setParams] = useSearchParams();
  const aba = (params.get("situacao") as Situacao) || "aberta";
  const [nova, setNova] = useState(false);

  const por = (s: Situacao) => q.data?.filter((p) => p.situacao === s) ?? [];

  return (
    <>
      <PageHeader
        titulo="Plano de ação"
        subtitulo="Quem faz, até quando e como vamos medir."
        acoes={
          <Button onClick={() => setNova(true)}>
            <Plus aria-hidden /> Nova ação
          </Button>
        }
      />
      <AvisoAssociacao className="-mt-3 mb-5 rounded-md border border-border bg-card px-3 py-2" />

      {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}

      {/* abas no celular, colunas no desktop */}
      <div role="tablist" aria-label="Situação" className="mb-4 flex gap-1 rounded-md border border-border bg-card p-1 lg:hidden">
        {COLUNAS.map((c) => (
          <button
            key={c.s}
            role="tab"
            aria-selected={aba === c.s}
            onClick={() => setParams({ situacao: c.s }, { replace: true })}
            className={cn("h-10 flex-1 rounded-sm text-[13px] font-medium", aba === c.s ? "bg-violeta-500 text-white" : "text-muted-foreground")}
          >
            {c.rotulo} ({por(c.s).length})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        {COLUNAS.map((c) => (
          <section key={c.s} aria-label={c.rotulo} className={cn("flex flex-col gap-3", aba !== c.s && "hidden lg:flex")}>
            <h2 className="sobretitulo hidden items-center justify-between text-muted-foreground lg:flex">
              {c.rotulo} <span className="tabular">{por(c.s).length}</span>
            </h2>
            {q.isLoading && <CardSkeleton linhas={3} />}
            {por(c.s).map((p) => (
              <ActionCard
                key={p.id}
                acao={p}
                rodape={
                  <Link to={`/acoes/${p.id}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "self-start")}>
                    Abrir <ArrowRight aria-hidden />
                  </Link>
                }
              />
            ))}
            {q.data && por(c.s).length === 0 && (
              <EmptyState
                className="py-8"
                titulo={c.s === "aberta" ? "Nenhuma ação aberta" : `Nenhuma ação ${c.rotulo.toLowerCase().slice(0, -1)}`}
                descricao={c.s === "aberta" ? "Crie uma ação a partir de uma oportunidade." : undefined}
                acao={c.s === "aberta" ? <Link to="/" className={buttonVariants({ size: "sm" })}>Ver oportunidades</Link> : undefined}
              />
            )}
          </section>
        ))}
      </div>
      <NovaAcaoDialog aberto={nova} onClose={() => setNova(false)} />
    </>
  );
}
