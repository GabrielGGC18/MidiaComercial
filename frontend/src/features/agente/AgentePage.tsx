import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, PackageSearch, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { api, json, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Campanha, PropostaAgente } from "@/api/types";
import { ContatoCard } from "@/components/midia/agente";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { LimitationNote } from "@/components/midia/sinais";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { numero } from "@/lib/format";
import AgenteChat from "./AgenteChat";

const ETAPAS = ["Sinais", "Produtos em baixa", "Clientes com consentimento", "Motivos", "Você aprova", "WhatsApp (você envia)", "Medição"];

export default function AgentePage() {
  const qc = useQueryClient();
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
          <Button variant="coral" onClick={() => rodar.mutate()} carregando={rodar.isPending}>
            {!rodar.isPending && <PackageSearch aria-hidden />} Buscar clientes
          </Button>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Como o agente trabalha">
        {ETAPAS.map((e, i) => (
          <li key={e} className="flex items-center gap-1.5">
            <span className={i === 4 || i === 5 ? "rounded-full bg-coral-100 px-2.5 py-1 font-semibold text-coral-700 dark:bg-coral-700/25 dark:text-coral-100" : "rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground"}>
              {e}
            </span>
            {i < ETAPAS.length - 1 && <span aria-hidden className="text-muted-foreground">→</span>}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <section aria-label="Campanhas" className="flex flex-col gap-6">
          {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}
          {q.isLoading && <CardSkeleton linhas={4} />}
          {q.data?.length === 0 && (
            <EmptyState
              titulo="Nenhuma campanha aberta"
              descricao="Toque em “Buscar clientes”. O agente olha estoque parado e categorias em queda e só sugere clientes que autorizaram contato."
            />
          )}
          {q.data?.map((c) => (
            <Card key={c.id} className="animate-entrar">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tom={c.gatilho === "estoque_parado" ? "atencao" : "coral"}>
                    <TrendingDown aria-hidden /> {c.gatilho === "estoque_parado" ? "Estoque parado" : "Queda de vendas"}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => encerrar.mutate(c.id)}>Encerrar</Button>
                </div>
                <CardTitle>{c.titulo}</CardTitle>
                <p className="text-sm text-muted-foreground">{c.motivo}</p>
                <dl className="mt-1 grid grid-cols-4 gap-2 rounded-md bg-muted/60 p-3 text-center">
                  {[
                    ["Sugeridos", c.medicao.propostas],
                    ["Aprovados", c.medicao.aprovadas],
                    ["Enviados", c.medicao.enviadas],
                    ["Compraram", c.medicao.convertidos],
                  ].map(([r, v]) => (
                    <div key={r as string}>
                      <dt className="overline text-muted-foreground">{r}</dt>
                      <dd className="font-display text-h3 font-bold tabular">{numero(v as number)}</dd>
                    </div>
                  ))}
                </dl>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  {c.propostas.map((p) => (
                    <ContatoCard
                      key={p.id}
                      proposta={p}
                      ocupado={acao.isPending && acao.variables?.id === p.id}
                      onAprovar={(m) => acao.mutate({ id: p.id, tipo: "confirmar", mensagem: m })}
                      onDescartar={() => acao.mutate({ id: p.id, tipo: "rejeitar" })}
                      onEnviada={() => acao.mutate({ id: p.id, tipo: "enviada" })}
                    />
                  ))}
                </div>
                <LimitationNote texto={c.medicao.limitacao} />
              </CardContent>
            </Card>
          ))}
        </section>

        <aside className="xl:sticky xl:top-8 xl:self-start">
          <Card className="flex h-[32rem] flex-col p-4">
            <p className="overline mb-3 flex items-center gap-1.5 text-violeta-700 dark:text-violeta-100">
              <Bot className="size-4" aria-hidden /> Preencher com IA
            </p>
            <AgenteChat className="min-h-0 flex-1" />
          </Card>
        </aside>
      </div>
    </>
  );
}
