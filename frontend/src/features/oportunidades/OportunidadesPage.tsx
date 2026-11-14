import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, RefreshCw, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { api, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Oportunidade, Painel } from "@/api/types";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { KpiBloco, KpiTile } from "@/components/midia/KpiTile";
import { AcaoPrincipal } from "@/components/midia/destaques";
import { BlockedRuleRow, OpportunityCard } from "@/components/midia/oportunidade";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { numero, pct, periodo, relativo } from "@/lib/format";
import { CriarAcaoDialog, DescartarDialog, DetalheDialog } from "./dialogs";

export default function OportunidadesPage() {
  const qc = useQueryClient();
  const chave = useChaveLoja("oportunidades");
  const q = useQuery({ queryKey: chave, queryFn: () => api<Painel>("/api/oportunidades/") });
  const [criar, setCriar] = useState<Oportunidade | null>(null);
  const [descartar, setDescartar] = useState<Oportunidade | null>(null);
  const [detalhe, setDetalhe] = useState<Oportunidade | null>(null);

  const recalcular = useMutation({
    mutationFn: () => api<Painel>("/api/oportunidades/gerar", { method: "POST" }),
    onSuccess: (p) => {
      qc.setQueryData(chave, p);
      toast.success("Oportunidades recalculadas com os dados mais recentes.");
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const p = q.data;
  const qual = p?.qualidade;
  const janela = p?.execucao ? periodo(p.execucao.janela_inicio, p.execucao.janela_fim) : "";
  const semAnalise = p?.estado === "sem_execucao";

  return (
    <>
      <PageHeader
        titulo="Oportunidades da semana"
        destaque={
          p && p.cartoes[0]
            ? `${p.cartoes.length} de 3 prontas para decidir · comece por “${p.cartoes[0].titulo}”`
            : undefined
        }
        subtitulo={
          p?.execucao ? (
            <>
              Janela {janela} · calculado {relativo(p.execucao.executado_em)}
              {p.execucao.desatualizada && " · há dados novos, recalcule"}
            </>
          ) : (
            "Até 3 decisões priorizadas, cada uma com evidência e limitação."
          )
        }
        acoes={
          <Button variant="secondary" onClick={() => recalcular.mutate()} carregando={recalcular.isPending}>
            {!recalcular.isPending && <RefreshCw aria-hidden />} Recalcular
          </Button>
        }
      />

      {q.isError && <ErrorState mensagem={mensagemErro(q.error)} onTentar={() => q.refetch()} />}

      {/* Faixa de KPIs */}
      <KpiBloco colunas={3}>
        {q.isLoading || !qual ? (
          [0, 1, 2].map((i) => <CardSkeleton key={i} linhas={1} className="border-0 shadow-none" />)
        ) : (
          <>
            <KpiTile
              embutido
              rotulo="Procuraram e não tinha"
              valor={qual.demandas_na_janela}
              periodo={janela}
              amostra="registros do balcão"
              destaque="coral"
              icone={<Search />}
            />
            <KpiTile
              embutido
              rotulo="Receita da janela"
              valor={qual.receita_janela}
              formato="moeda"
              periodo={janela}
              amostra={`${numero(qual.pedidos_na_janela)} pedidos`}
              destaque="violeta"
              icone={<Wallet />}
            />
            <KpiTile
              embutido
              rotulo="Ticket médio"
              valor={qual.ticket_medio}
              formato="moeda"
              periodo={janela}
              amostra="pedidos concluídos"
              icone={<Boxes />}
            />
          </>
        )}
      </KpiBloco>

      {/* Qualidade dos dados */}
      {qual && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge tom={qual.estoque_atualizado ? "ok" : "atencao"}>
            Estoque {qual.idade_estoque_horas === null ? "não importado" : `atualizado há ${Math.round(qual.idade_estoque_horas)} h`}
          </Badge>
          <Badge tom={qual.cobertura_cliente_pct >= 30 ? "ok" : "bloqueado"}>
            {pct(qual.cobertura_cliente_pct)} dos pedidos com cliente identificado
          </Badge>
          <Badge tom="neutro">{numero(qual.itens_na_janela)} itens vendidos</Badge>
        </div>
      )}

      {/* Cartões */}
      <section aria-label="Oportunidades" className="mt-6 grid gap-4">
        {q.isLoading && [0, 1].map((i) => <CardSkeleton key={i} linhas={4} />)}
        {p?.cartoes.map((o, i) => (
          <OpportunityCard
            key={o.id}
            indice={i}
            total={p.cartoes.length}
            oportunidade={o}
            onCriarAcao={() => setCriar(o)}
            onDescartar={() => setDescartar(o)}
            onDetalhes={() => setDetalhe(o)}
          />
        ))}
        {semAnalise && (
          <EmptyState
            titulo="Gere a primeira análise"
            descricao="A loja ainda não foi analisada. Gere a análise com as vendas, o estoque e as procuras já registradas."
            acao={
              <Button size="sm" onClick={() => recalcular.mutate()} carregando={recalcular.isPending}>
                Gerar primeira análise
              </Button>
            }
          />
        )}
        {p && !semAnalise && p.cartoes.length === 0 && (
          <EmptyState
            titulo="Nenhuma oportunidade nesta janela"
            descricao="Isso pode ser bom sinal. Para a análise ficar mais rica, importe vendas recentes e peça ao balcão para registrar o que os clientes procuram e não encontram."
            acao={
              <div className="flex flex-wrap justify-center gap-2">
                <AcaoPrincipal>
                  <Link to="/importar" className={buttonVariants({ variant: "secondary", size: "sm" })}>Importar CSV</Link>
                </AcaoPrincipal>
                <Link to="/balcao" className={buttonVariants({ size: "sm" })}>Abrir balcão</Link>
              </div>
            }
          />
        )}
      </section>

      {p && p.bloqueios.length > 0 && (
        <section aria-label="Regras bloqueadas" className="mt-6 flex flex-col gap-2">
          <p className="sobretitulo text-muted-foreground">O que não dá para calcular agora</p>
          {p.bloqueios.map((b) => (
            <BlockedRuleRow key={b.regra} bloqueio={b} />
          ))}
        </section>
      )}

      <CriarAcaoDialog oportunidade={criar} onClose={() => setCriar(null)} chavePainel={chave} />
      <DescartarDialog oportunidade={descartar} onClose={() => setDescartar(null)} chavePainel={chave} />
      <DetalheDialog
        oportunidade={detalhe}
        onClose={() => setDetalhe(null)}
        onCriarAcao={(o) => {
          setDetalhe(null);
          setCriar(o);
        }}
      />
    </>
  );
}
