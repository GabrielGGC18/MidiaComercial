import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Check, LineChart, User, X } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { api, mensagemErro } from "@/api/client";
import type { Plano } from "@/api/types";
import { AvisoAssociacao, BeforeAfter } from "@/components/midia/acao";
import { Confirmacao } from "@/components/midia/destaques";
import { CardSkeleton, ErrorState } from "@/components/midia/estado";
import { SignalBadge } from "@/components/midia/sinais";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dataHora, dataLonga } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MedicaoDialog, MudarSituacaoDialog } from "./dialogs";

const SIT = { aberta: ["Aberta", "violeta"], concluida: ["Concluída", "ok"], descartada: ["Descartada", "bloqueado"] } as const;

export default function AcaoDetalhePage() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ["acoes", "detalhe", Number(id)], queryFn: () => api<Plano>(`/api/acoes/${id}`) });
  const [medir, setMedir] = useState(false);
  const [situacao, setSituacao] = useState<"concluida" | "descartada" | null>(null);
  const p = q.data;

  return (
    <>
      <Link to="/acoes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Plano de ação
      </Link>
      {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}
      {q.isLoading && <CardSkeleton linhas={6} />}
      {p && (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] [&>*]:min-w-0">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tom={SIT[p.situacao][1]}>{SIT[p.situacao][0]}</Badge>
                {p.atrasado && <Badge tom="erro">Atrasada</Badge>}
              </div>
              <h1 className="mt-2 font-display text-h2 font-bold sm:text-h1">{p.titulo}</h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><User className="size-4" aria-hidden /> {p.responsavel}</span>
                <span className={cn("inline-flex items-center gap-1.5", p.atrasado && "font-semibold text-erro-tx dark:text-erro")}>
                  <CalendarClock className="size-4" aria-hidden /> Prazo {dataLonga(p.prazo)}
                </span>
                <span>Criada {dataHora(p.criado_em)}</span>
              </div>
            </div>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Medição</CardTitle>
                {p.situacao === "aberta" && (
                  <Button size="sm" variant="secondary" onClick={() => setMedir(true)}>
                    <LineChart aria-hidden /> Registrar medição
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm"><span className="font-semibold">Indicador:</span> {p.indicador}</p>
                <BeforeAfter medicao={p.medicoes[0]} />
                {p.medicoes[0]?.contexto && <p className="text-[13px] text-muted-foreground">Contexto: {p.medicoes[0].contexto}</p>}
                <AvisoAssociacao />
                {p.medicoes.length > 1 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer font-medium text-primary">Medições anteriores ({p.medicoes.length - 1})</summary>
                    <ul className="mt-2 flex flex-col gap-2">
                      {p.medicoes.slice(1).map((m) => (
                        <li key={m.id}><BeforeAfter medicao={m} /></li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>

            {p.justificativa && (
              <Card>
                <CardHeader><CardTitle>Observação</CardTitle></CardHeader>
                <CardContent><p className="text-sm">{p.justificativa}</p></CardContent>
              </Card>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            {p.oportunidade && (
              <Card>
                <CardHeader>
                  <p className="sobretitulo text-muted-foreground">Veio da oportunidade</p>
                  <CardTitle className="text-base">{p.oportunidade.titulo}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <SignalBadge status={p.oportunidade.status} />
                  <p className="font-mono text-xs text-muted-foreground">{p.oportunidade.regra}</p>
                </CardContent>
              </Card>
            )}
            {p.situacao === "aberta" && (
              <Card className="p-4">
                <div className="flex flex-col gap-2">
                  <Confirmacao><Button className="w-full" onClick={() => setSituacao("concluida")}><Check aria-hidden /> Concluir</Button></Confirmacao>
                  <Button variant="ghost" onClick={() => setSituacao("descartada")}><X aria-hidden /> Descartar com justificativa</Button>
                </div>
              </Card>
            )}
          </aside>

          <MedicaoDialog plano={p} aberto={medir} onClose={() => setMedir(false)} />
          <MudarSituacaoDialog plano={p} situacao={situacao} onClose={() => setSituacao(null)} />
        </div>
      )}
    </>
  );
}
