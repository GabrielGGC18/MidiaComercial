import { useQuery } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { api, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Motivo, Ranking } from "@/api/types";
import { ChipPicker, DemandRanking } from "@/components/midia/demanda";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { LimitationNote } from "@/components/midia/sinais";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOTIVOS, isoDaqui, isoHoje, numero, periodo } from "@/lib/format";

export default function DemandaPage() {
  const [params, setParams] = useSearchParams();
  const motivo = (params.get("motivo") as Motivo | null) ?? null;
  const inicio = isoDaqui(-29);
  const fim = isoHoje();
  const chave = useChaveLoja("demandas", "ranking", motivo, inicio);
  const q = useQuery({
    queryKey: chave,
    queryFn: () =>
      api<Ranking>(`/api/demandas/ranking?inicio=${inicio}&fim=${fim}${motivo ? `&motivo=${motivo}` : ""}`),
  });
  const r = q.data;

  return (
    <>
      <PageHeader
        titulo="Procuraram e não tinha"
        subtitulo={r ? `Últimos 30 dias · ${periodo(r.inicio, r.fim)} · ${numero(r.total)} registros do balcão` : "O sinal que faltava: o que o cliente pediu e a loja não tinha."}
        acoes={
          <Link to="/balcao" className={buttonVariants({ variant: "coral" })}>
            <Smartphone aria-hidden /> Registrar no balcão
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Ranking por produto e variação</CardTitle>
            <CardDescription>Itens zerados no estoque aparecem com o saldo em destaque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <ChipPicker
                rotulo="Filtrar por motivo"
                opcoes={Object.entries(MOTIVOS).map(([v, rotulo]) => ({ valor: v as Motivo, rotulo }))}
                valor={motivo}
                onChange={(v) => {
                  const p = new URLSearchParams(params);
                  if (v) p.set("motivo", v);
                  else p.delete("motivo");
                  setParams(p, { replace: true });
                }}
              />
            </div>
            {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}
            {q.isLoading && <CardSkeleton linhas={5} />}
            {r && r.itens.length > 0 && <DemandRanking itens={r.itens} />}
            {r && r.itens.length === 0 && (
              <EmptyState
                titulo="Nenhum registro"
                descricao={motivo ? "Nada com esse motivo no período." : "Peça à equipe para registrar no balcão quando o cliente não encontrar algo."}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Por motivo</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm">
                {Object.entries(MOTIVOS).map(([m, rotulo]) => (
                  <li key={m} className="flex items-center justify-between">
                    <span>{rotulo}</span>
                    <strong className="tabular">{numero(r?.por_motivo[m] ?? 0)}</strong>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <LimitationNote texto="Cada registro é um atendimento, não um comprador único nem uma venda garantida." />
        </div>
      </div>
    </>
  );
}
