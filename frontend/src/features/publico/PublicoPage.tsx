import { useQuery } from "@tanstack/react-query";
import { Download, Lock, Receipt, ShoppingBag, UserCheck, Wallet } from "lucide-react";
import { useSearchParams } from "react-router";
import { api, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Publico } from "@/api/types";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { CategoryBars, HeatmapWeek, SerieReceita, type Unidade } from "@/components/midia/graficos";
import { KpiBloco, KpiTile } from "@/components/midia/KpiTile";
import { FaixaEtariaBars, PeriodosNicho } from "@/components/midia/publico";
import { CoverageNote, LimitationNote, SignalBadge } from "@/components/midia/sinais";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { data as dataCurta, isoDaqui, isoHoje, moeda, numero, pct, periodo } from "@/lib/format";
import { baixarCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

const PERIODOS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];
const UNIDADES: { v: Unidade; rotulo: string }[] = [
  { v: "receita", rotulo: "Receita" },
  { v: "unidades", rotulo: "Unidades" },
  { v: "pedidos", rotulo: "Pedidos" },
];

function Segmentado<T extends string | number>({
  opcoes,
  valor,
  onChange,
  rotulo,
}: {
  opcoes: { v: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex w-full rounded-md border border-border bg-card p-0.5 shadow-xs sm:inline-flex sm:w-auto">
      {opcoes.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={o.v === valor}
          onClick={() => onChange(o.v)}
          className={cn(
            "h-11 flex-1 whitespace-nowrap rounded-sm px-3 text-[13px] font-medium transition sm:h-9 sm:flex-none-colors",
            o.v === valor ? "bg-violeta-500 text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export default function PublicoPage() {
  // filtros na URL: compartilhável e sobrevive ao F5 (§6.3)
  const [params, setParams] = useSearchParams();
  const dias = Number(params.get("dias") ?? 30) || 30;
  const unidade = (params.get("unidade") as Unidade) || "receita";
  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p, { replace: true });
  };

  const inicio = isoDaqui(-(dias - 1));
  const fim = isoHoje();
  const chave = useChaveLoja("publico", inicio, fim);
  const q = useQuery({
    queryKey: chave,
    queryFn: () => api<Publico>(`/api/analises/publico?inicio=${inicio}&fim=${fim}`),
  });
  const d = q.data;
  const per = d ? periodo(d.inicio, d.fim) : "";
  // linha de destaque: "o que mudou?", calculada com o que já veio da API
  const destaque = (() => {
    if (!d || !d.kpis.pedidos) return undefined;
    const lider = d.categorias[0];
    const pico = d.periodos.top[0];
    const melhorDia = d.serie_diaria.reduce((a, b) => (Number(b.receita) > Number(a.receita) ? b : a), d.serie_diaria[0]);
    return [
      lider && `${lider.categoria} lideram (${pct(lider.participacao_receita)})`,
      pico && `pico ${pico.periodo.toLowerCase()}`,
      melhorDia && `melhor dia ${dataCurta(melhorDia.data)}`,
      d.faixas.principal && `quem mais compra: ${d.faixas.principal} anos`,
    ].filter(Boolean).join(" · ");
  })();

  // Relatório do período em CSV, montado com os mesmos números que estão na tela
  const exportar = () => {
    if (!d) return;
    baixarCsv(`relatorio-${dias}-dias-${isoHoje()}.csv`, [
      ["Relatório", `Últimos ${dias} dias`],
      ["Gerado em", isoHoje()],
      [],
      ["Indicador", "Valor"],
      ["Receita", d.kpis.receita],
      ["Devoluções", d.kpis.devolucoes],
      ["Pedidos", d.kpis.pedidos],
      ["Ticket médio", d.kpis.ticket_medio],
      ["Itens", d.kpis.itens],
      [],
      ["Categoria", "Receita", "Unidades", "Pedidos", "Participação na receita (%)"],
      ...d.categorias.map((c) => [c.categoria, c.receita, c.unidades, c.pedidos, c.participacao_receita]),
      [],
      ["Dia", "Receita"],
      ...d.serie_diaria.map((x) => [x.data, x.receita]),
    ]);
  };

  return (
    <>
      <PageHeader
        titulo="Meu público"
        subtitulo="Quem compra, o quê e quando. Só pedidos concluídos; devoluções aparecem à parte."
        destaque={destaque}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <Segmentado
              rotulo="Período"
              opcoes={PERIODOS.map((p) => ({ v: p.dias, rotulo: p.rotulo }))}
              valor={dias}
              onChange={(v) => setParam("dias", String(v))}
            />
            <button
              type="button"
              disabled={!d || d.kpis.pedidos === 0}
              onClick={exportar}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden /> Exportar CSV
            </button>
          </div>
        }
      />

      {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}

      <KpiBloco>
        {!d
          ? [0, 1, 2, 3].map((i) => <CardSkeleton key={i} linhas={1} className="border-0 shadow-none" />)
          : (
            <>
              <KpiTile embutido rotulo="Receita" valor={Number(d.kpis.receita)} formato="moeda" periodo={per} amostra={`devoluções ${moeda(d.kpis.devolucoes)}`} destaque="violeta" icone={<Wallet />} />
              <KpiTile embutido rotulo="Ticket médio" valor={Number(d.kpis.ticket_medio)} formato="moeda" periodo={per} amostra={`${numero(d.kpis.pedidos)} pedidos`} icone={<Receipt />} />
              <KpiTile embutido rotulo="Pedidos" valor={d.kpis.pedidos} periodo={per} amostra={`${numero(d.kpis.itens)} itens`} icone={<ShoppingBag />} />
              <KpiTile embutido rotulo="Clientes identificados" valor={Number(d.cobertura.percentual)} formato="pct" periodo={per} amostra={`${d.cobertura.identificados} de ${d.cobertura.total} pedidos`} icone={<UserCheck />} />
            </>
          )}
      </KpiBloco>

      {d && d.kpis.pedidos === 0 && (
        <EmptyState className="mt-6" titulo="Sem vendas no período" descricao="Importe o CSV de vendas ou escolha um período maior." />
      )}

      {d && d.kpis.pedidos > 0 && (
        <div className="mt-6 grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
          <Card>
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Vendas por categoria</CardTitle>
                <CardDescription>Participação no período</CardDescription>
              </div>
              <Segmentado rotulo="Unidade" opcoes={UNIDADES} valor={unidade} onChange={(v) => setParam("unidade", v)} />
            </CardHeader>
            <CardContent>
              <CategoryBars dados={d.categorias} unidade={unidade} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Receita por dia</CardTitle>
              <CardDescription>Domingos fechados aparecem como zero</CardDescription>
            </CardHeader>
            <CardContent>
              <SerieReceita serie={d.serie_diaria} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quando compram</CardTitle>
              <CardDescription>Pedidos por dia da semana e hora</CardDescription>
            </CardHeader>
            <CardContent>
              <HeatmapWeek celulas={d.heatmap} />
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Período e horário por nicho</CardTitle>
              <CardDescription>Quando o público compra cada categoria: escale a equipe e monte a vitrine para esses horários</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <PeriodosNicho p={d.periodos} />
              <LimitationNote texto={d.periodos.limitacao} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Faixa de idade do público</CardTitle>
                <CardDescription>
                  {d.faixas.principal ? `Quem mais compra: ${d.faixas.principal} anos` : "Ainda sem faixa suficiente"} · {pct(d.faixas.cobertura.percentual)} dos pedidos com faixa
                </CardDescription>
              </div>
              <SignalBadge status={d.faixas.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {d.faixas.status === "bloqueada" ? (
                <div className="flex gap-3 rounded-md bg-muted p-4 text-sm">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p>Poucos pedidos com faixa etária ({d.faixas.cobertura.com_faixa}). Peça ao balcão para marcar a idade aproximada ou use a voz.</p>
                </div>
              ) : (
                <FaixaEtariaBars f={d.faixas} />
              )}
              <LimitationNote texto={d.faixas.limitacao} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <CardTitle>Recorrência</CardTitle>
                <CardDescription>Só clientes identificados</CardDescription>
              </div>
              <SignalBadge status={d.recorrencia.status} />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {d.recorrencia.status === "bloqueada" ? (
                <div className="flex gap-3 rounded-md bg-muted p-4 text-sm">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p>{d.recorrencia.motivo}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-muted/60 p-4">
                      <p className="sobretitulo text-muted-foreground">Compra única</p>
                      <p className="font-display text-h1 font-bold tabular">{pct(d.recorrencia.compra_unica_pct)}</p>
                    </div>
                    <div className="rounded-md bg-violeta-50 p-4 dark:bg-violeta-900/30">
                      <p className="sobretitulo text-violeta-700 dark:text-violeta-100">2+ compras</p>
                      <p className="font-display text-h1 font-bold text-violeta-700 tabular dark:text-violeta-100">{pct(d.recorrencia.recorrentes_pct)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{numero(d.recorrencia.clientes_identificados)} clientes identificados no período.</p>
                </>
              )}
              <CoverageNote percentual={d.cobertura.percentual} identificados={d.cobertura.identificados} total={d.cobertura.total} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
