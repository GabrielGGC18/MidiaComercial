import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, PackageSearch, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { api, json, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Campanha, PropostaAgente } from "@/api/types";
import { ContatoCard } from "@/components/midia/agente";
import { AcaoPrincipal, CartaoExploravel, Processando } from "@/components/midia/destaques";
import { ListaAoVivo } from "@/components/midia/lista-ao-vivo";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { LimitationNote } from "@/components/midia/sinais";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { CountUp } from "@/components/midia/numeros";
import { cn } from "@/lib/utils";
import AgenteChat from "./AgenteChat";

const ETAPAS = ["Sinais", "Produtos em baixa", "Clientes com consentimento", "Motivos", "Você aprova", "WhatsApp (você envia)", "Medição"];

export default function AgentePage() {
  const qc = useQueryClient();
  const [aba, setAba] = useState<"campanhas" | "conversa">("campanhas");
  const chave = useChaveLoja("agente", "campanhas");
  const q = useQuery({ queryKey: chave, queryFn: () => api<Campanha[]>("/api/agente/campanhas") });

  const rodar = useMutation({
    mutationFn: () => api<Campanha[]>("/api/agente/prospeccao", { method: "POST" }),
    onSuccess: (novas) => {
      void qc.invalidateQueries({ queryKey: ["agente"] });
      toast(novas.length ? `${novas.length} campanha(s) proposta(s). Revise cada mensagem.` : "Nenhum produto em baixa com clientes para oferecer agora.");
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const acao = useMutation({
    mutationFn: ({ id, tipo, mensagem }: { id: number; tipo: "confirmar" | "rejeitar" | "enviada"; mensagem?: string }) =>
      api<PropostaAgente>(`/api/agente/propostas/${id}/${tipo}`, {
        method: "POST",
        body: tipo === "confirmar" ? json({ ajustes: { mensagem } }) : undefined,
      }),
    onSuccess: (p) => {
      qc.setQueryData<Campanha[]>(chave, (cs) =>
        cs?.map((c) => (c.id === p.campanha_id ? { ...c, propostas: c.propostas.map((x) => (x.id === p.id ? p : x)) } : c)),
      );
      if (p.status === "enviada") void qc.invalidateQueries({ queryKey: chave });
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const encerrar = useMutation({
    mutationFn: (id: number) => api<Campanha>(`/api/agente/campanhas/${id}/encerrar`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  return (
    <>
      <PageHeader
        titulo="Agente de vendas"
        subtitulo="Quando um produto está em baixa, o agente encontra clientes com chance real de interesse. Você aprova; você envia."
        acoes={
          <AcaoPrincipal>
            <Button variant="coral" className="w-full" onClick={() => rodar.mutate()} carregando={rodar.isPending}>
              {!rodar.isPending && <PackageSearch aria-hidden />} Buscar clientes para produtos em baixa
            </Button>
          </AcaoPrincipal>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Como o agente trabalha">
        {ETAPAS.map((e, i) => (
          <li key={e} className="flex items-center gap-1.5">
            <span className={i === 4 || i === 5 ? "rounded-sm bg-coral-100 px-2.5 py-1 font-semibold text-coral-700 dark:bg-coral-700/25 dark:text-coral-100" : "rounded-sm bg-muted px-2.5 py-1 font-medium text-muted-foreground"}>
              {e}
            </span>
            {i < ETAPAS.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>

      {/* celular/tablet: abas; desktop: lado a lado (docs/08 §7) */}
      <div role="tablist" aria-label="Agente" className="mb-4 flex gap-1 rounded-md border border-border bg-card p-1 xl:hidden">
        {(["campanhas", "conversa"] as const).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={cn("h-10 flex-1 rounded-sm text-[13px] font-medium", aba === a ? "bg-violeta-500 text-white" : "text-muted-foreground")}
          >
            {a === "campanhas" ? `Campanhas (${q.data?.length ?? 0})` : "Conversa"}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem] [&>*]:min-w-0">
        <section aria-label="Campanhas" className={cn("flex flex-col gap-6", aba !== "campanhas" && "max-xl:hidden")}>
          {rodar.isPending && <Processando>O agente está olhando estoque, vendas e clientes…</Processando>}
          {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}
          {q.isLoading && <CardSkeleton linhas={4} />}
          {q.data?.length === 0 && (
            <EmptyState
              titulo="Nenhuma campanha aberta"
              descricao="Toque em “Buscar clientes”. O agente olha estoque parado e categorias em queda e só sugere clientes que autorizaram contato."
            />
          )}
          {q.data?.map((c) => (
            <CartaoExploravel key={c.id} className="rounded-lg border border-border bg-card shadow-sm">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tom={c.gatilho === "estoque_parado" ? "atencao" : "coral"}>
                    <TrendingDown aria-hidden /> {c.gatilho === "estoque_parado" ? "Estoque parado" : "Queda de vendas"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => encerrar.mutate(c.id)}>Encerrar</Button>
                </div>
                <CardTitle>{c.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">{c.motivo}</p>
                <dl className="mt-1 grid grid-cols-4 divide-x divide-border border border-border bg-muted/40 text-center" aria-label="Funil da campanha">
                  {[
                    ["Sugeridos", c.medicao.propostas],
                    ["Aprovados", c.medicao.aprovadas],
                    ["Enviados", c.medicao.enviadas],
                    ["Compraram", c.medicao.convertidos],
                  ].map(([r, v]) => (
                    <div key={r as string} className="px-2 py-2.5">
                      <dt className="sobretitulo text-muted-foreground">{r}</dt>
                      <dd className="font-display text-h3 font-bold tabular"><CountUp para={v as number} /></dd>
                    </div>
                  ))}
                </dl>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ListaAoVivo
                  className="grid gap-3 lg:grid-cols-2"
                  rotulo="Clientes sugeridos"
                  itens={c.propostas}
                  chave={(p) => p.id}
                  render={(p) => (
                    <ContatoCard
                      key={p.id}
                      proposta={p}
                      ocupado={acao.isPending && acao.variables?.id === p.id}
                      onAprovar={(m) => acao.mutate({ id: p.id, tipo: "confirmar", mensagem: m })}
                      onDescartar={() => acao.mutate({ id: p.id, tipo: "rejeitar" })}
                      onEnviada={() => acao.mutate({ id: p.id, tipo: "enviada" })}
                    />
                  )}
                />
                <LimitationNote texto={c.medicao.limitacao} />
              </CardContent>
            </CartaoExploravel>
          ))}
        </section>

        <aside className={cn("xl:sticky xl:top-8 xl:self-start", aba !== "conversa" && "max-xl:hidden")}>
          <Card className="flex h-[32rem] flex-col p-4">
            <p className="sobretitulo mb-3 flex items-center gap-1.5 text-violeta-700 dark:text-violeta-100">
              <Bot className="size-4" aria-hidden /> Preencher com IA
            </p>
            <AgenteChat className="min-h-0 flex-1" />
          </Card>
        </aside>
      </div>
    </>
  );
}
