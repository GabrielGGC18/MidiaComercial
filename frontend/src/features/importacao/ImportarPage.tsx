import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Copy, Download, FlaskConical } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { api, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Lote, LoteResumo } from "@/api/types";
import { Processando } from "@/components/midia/destaques";
import { PageHeader } from "@/components/midia/estado";
import { DropzoneCsv, ImportStepper, ReconciliationBar, RejectedRowsTable } from "@/components/midia/importacao";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { dataHora, moeda, numero } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tipo = "vendas" | "estoque";

const COLUNAS_PREVIA: Record<Tipo, string[]> = {
  vendas: ["pedido_id", "data_hora", "sku", "quantidade", "receita_item", "status"],
  estoque: ["sku", "saldo", "capturado_em"],
};

function celula(col: string, v: unknown) {
  if (v === null || v === undefined || v === "") return "—";
  if (col === "receita_item") return moeda(String(v));
  if (col === "data_hora" || col === "capturado_em") return dataHora(String(v));
  return String(v);
}

export default function ImportarPage() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<Tipo>("vendas");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [totalOrigem, setTotalOrigem] = useState("");
  const [lote, setLote] = useState<Lote | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);

  const chaveLotes = useChaveLoja("importacoes");
  const historico = useQuery({ queryKey: chaveLotes, queryFn: () => api<LoteResumo[]>("/api/importacoes/") });

  const etapa: 1 | 2 | 3 = !lote ? 1 : lote.status === "previa" ? 2 : 3;

  const previa = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append("arquivo", arquivo!);
      fd.append("tipo", tipo);
      if (totalOrigem.trim()) fd.append("total_origem", totalOrigem);
      return api<Lote>("/api/importacoes/preview", { method: "POST", body: fd });
    },
    onMutate: () => setErroArquivo(null),
    onSuccess: setLote,
    onError: (e) => setErroArquivo(mensagemErro(e)),
  });

  const confirmar = useMutation({
    mutationFn: () => api<Lote>(`/api/importacoes/${lote!.id}/confirmar`, { method: "POST" }),
    onSuccess: (l) => {
      setLote(l);
      // dados novos: recalcula tudo que depende de vendas/estoque
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      toast.success(`${numero(l.linhas_ok)} linhas importadas.`);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const cancelar = useMutation({
    mutationFn: () => api<Lote>(`/api/importacoes/${lote!.id}/cancelar`, { method: "POST" }),
    onSuccess: () => {
      reiniciar();
      void historico.refetch();
    },
  });

  const reiniciar = () => {
    setLote(null);
    setArquivo(null);
    setTotalOrigem("");
    setErroArquivo(null);
  };

  return (
    <>
      <PageHeader titulo="Importar dados" subtitulo="Vendas e estoque do seu PDV/ERP, por CSV. Nada é gravado antes da sua confirmação." />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-4">
          <ImportStepper etapa={etapa} />
          {lote && <span className="text-xs text-muted-foreground">Lote #{lote.id} · {lote.nome_arquivo}</span>}
        </CardHeader>
        <CardContent>
          {/* 1 · Arquivo */}
          {etapa === 1 && (
            <form
              className="grid gap-5 lg:grid-cols-[1fr_18rem]"
              onSubmit={(e) => {
                e.preventDefault();
                if (arquivo) previa.mutate();
              }}
            >
              <div className="flex flex-col gap-4">
                <fieldset className="flex gap-2" aria-label="Tipo de arquivo">
                  {(["vendas", "estoque"] as Tipo[]).map((t) => (
                    <label
                      key={t}
                      className={cn(
                        "flex h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors",
                        tipo === t ? "border-violeta-500 bg-violeta-50 text-violeta-700 dark:bg-violeta-900/40 dark:text-violeta-100" : "border-border hover:bg-muted",
                      )}
                    >
                      <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="accent-violeta-500" />
                      {t === "vendas" ? "Vendas" : "Estoque"}
                    </label>
                  ))}
                </fieldset>
                <DropzoneCsv arquivo={arquivo} onArquivo={setArquivo} />
                {erroArquivo && (
                  <p role="alert" className="flex gap-2 rounded-md bg-erro-bg px-3 py-2 text-sm text-erro-tx dark:bg-erro/10 dark:text-erro">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {erroArquivo}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-4">
                {tipo === "vendas" && (
                  <Field label="Total do relatório de origem (R$)" htmlFor="total" ajuda="Opcional. Usado para conferir se nada ficou de fora.">
                    <Input id="total" inputMode="decimal" placeholder="18.432,90" value={totalOrigem} onChange={(e) => setTotalOrigem(e.target.value)} />
                  </Field>
                )}
                <div className="flex flex-col gap-2 rounded-md bg-muted/60 p-3 text-sm">
                  <a className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href={`/api/importacoes/modelo?tipo=${tipo}`}>
                    <Download className="size-4" aria-hidden /> Baixar modelo de CSV
                  </a>
                  {tipo === "vendas" && (
                    <a className="inline-flex items-center gap-2 font-medium text-primary hover:underline" href="/api/importacoes/exemplo">
                      <FlaskConical className="size-4" aria-hidden /> CSV de exemplo da demo
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {tipo === "vendas"
                      ? "Uma linha por item. Nunca coloque CPF, nome ou telefone em cliente_ref."
                      : "Colunas: sku;saldo;capturado_em (com fuso)."}
                  </p>
                </div>
                <Button type="submit" disabled={!arquivo} carregando={previa.isPending}>
                  Ver prévia
                </Button>
                {previa.isPending && <Processando className="text-center text-xs">Conferindo linha por linha…</Processando>}
              </div>
            </form>
          )}

          {/* 2 · Prévia */}
          {lote && etapa >= 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2" aria-live="polite">
                <Badge tom="ok"><CheckCircle2 aria-hidden /> {numero(lote.linhas_ok)} aceitas</Badge>
                <Badge tom="atencao"><Copy aria-hidden /> {numero(lote.linhas_duplicadas)} duplicadas (ignoradas)</Badge>
                <Badge tom={lote.linhas_rejeitadas ? "erro" : "neutro"}><CircleAlert aria-hidden /> {numero(lote.linhas_rejeitadas)} rejeitadas</Badge>
              </div>

              {etapa === 2 && lote.previa.length > 0 && (
                <div>
                  <p className="sobretitulo mb-2 text-muted-foreground">Prévia ({Math.min(5, lote.previa.length)} primeiras linhas)</p>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                        <tr>{COLUNAS_PREVIA[lote.tipo].map((c) => <th key={c} scope="col" className="px-3 py-2 font-semibold">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lote.previa.map((l, i) => (
                          <tr key={i}>
                            {COLUNAS_PREVIA[lote.tipo].map((c) => (
                              <td key={c} className={cn("whitespace-nowrap px-3 py-2 tabular", c === "sku" && "font-mono text-xs")}>{celula(c, l[c])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {lote.reconciliacao && (
                <div>
                  <p className="sobretitulo mb-2 text-muted-foreground">Reconciliação</p>
                  <ReconciliationBar r={lote.reconciliacao} />
                </div>
              )}
              {lote.tipo === "vendas" && !lote.reconciliacao && (
                <p className="text-sm text-muted-foreground">
                  Total importado (vendas concluídas): <strong className="tabular text-foreground">{moeda(lote.total_importado)}</strong>
                </p>
              )}

              {lote.rejeitadas.length > 0 && (
                <div>
                  <p className="sobretitulo mb-2 text-muted-foreground">Linhas rejeitadas: corrija e envie de novo</p>
                  <RejectedRowsTable linhas={lote.rejeitadas} />
                </div>
              )}

              {etapa === 2 ? (
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button variant="secondary" onClick={() => cancelar.mutate()} carregando={cancelar.isPending}>Cancelar</Button>
                  <Button onClick={() => confirmar.mutate()} carregando={confirmar.isPending} disabled={lote.linhas_ok === 0}>
                    Confirmar importação de {numero(lote.linhas_ok)} linhas
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-md border border-sinal-ok/30 bg-sinal-ok-bg p-4 dark:bg-sinal-ok/10" role="status">
                  <p className="flex items-center gap-2 font-semibold text-sinal-ok-tx dark:text-sinal-ok">
                    <CheckCircle2 className="size-5" aria-hidden /> Importação confirmada
                  </p>
                  <p className="text-sm">O arquivo não ficou guardado: só o resumo e os totais. Recalcule as oportunidades para usar os dados novos.</p>
                  <div className="flex flex-wrap gap-2">
                    <Link to="/oportunidades" className={buttonVariants({ size: "sm" })}>Ver oportunidades</Link>
                    <Button size="sm" variant="secondary" onClick={reiniciar}>Importar outro arquivo</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de importações</CardTitle>
          <CardDescription>Reimportar o mesmo arquivo não duplica dados.</CardDescription>
        </CardHeader>
        <CardContent>
          {historico.data?.length ? (
            <ul className="divide-y divide-border">
              {historico.data.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">#{h.id}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{h.nome_arquivo || h.tipo}</span>
                  <Badge tom={h.status === "confirmado" ? "ok" : h.status === "previa" ? "info" : "bloqueado"}>{h.status}</Badge>
                  <span className="tabular text-muted-foreground">{numero(h.linhas_ok)} linhas</span>
                  <span className="text-xs text-muted-foreground">{dataHora(h.criado_em)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma importação ainda. Os dados da demo foram gerados pelo seed (90 dias).
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
