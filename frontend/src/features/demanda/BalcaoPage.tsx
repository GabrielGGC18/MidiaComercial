import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Keyboard, ShieldAlert } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api, json, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { DemandaIn, DemandaRegistrada, ProdutoCatalogo, PropostaAgente, RespostaAgente } from "@/api/types";
import { PropostaCard, VozButton } from "@/components/midia/agente";
import { DemandQuickForm } from "@/components/midia/demanda";
import { hora, rotuloFaixa } from "@/lib/format";
import { useVoz } from "@/lib/voz";

/** Balcão: "Cliente procurou e não encontrou" em ≤ 4 toques ou por voz (P0-4, docs/07 §4.3). */
export default function BalcaoPage() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [ultimo, setUltimo] = useState<{ id: number; rotulo: string; motivo: string } | null>(null);
  const [propostas, setPropostas] = useState<PropostaAgente[]>([]);
  const [textoAgente, setTextoAgente] = useState("");

  const chaveCatalogo = useChaveLoja("catalogo", busca);
  const catalogo = useQuery({
    queryKey: chaveCatalogo,
    queryFn: () => api<ProdutoCatalogo[]>(`/api/catalogo/?q=${encodeURIComponent(busca)}`),
    enabled: busca.length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const chaveRecentes = useChaveLoja("demandas", "recentes");
  const recentes = useQuery({ queryKey: chaveRecentes, queryFn: () => api<DemandaRegistrada[]>("/api/demandas/recentes") });

  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ["demandas"] });
    void qc.invalidateQueries({ queryKey: ["oportunidades"] });
    void qc.invalidateQueries({ queryKey: ["publico"] });
  };

  const registrar = useMutation({
    mutationFn: (d: DemandaIn) => api<DemandaRegistrada>("/api/demandas/", { method: "POST", body: json(d) }),
    onSuccess: (d) => {
      setUltimo({ id: d.id, rotulo: d.rotulo, motivo: d.motivo_rotulo + (d.faixa_etaria ? ` · ${rotuloFaixa(d.faixa_etaria)} anos` : "") });
      atualizar();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const desfazer = useMutation({
    mutationFn: (id: number) => api(`/api/demandas/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setUltimo(null);
      toast("Registro desfeito.");
      atualizar();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  // agente: frase falada ou digitada → proposta → pessoa confirma
  const perguntar = useMutation({
    mutationFn: (texto: string) =>
      api<RespostaAgente>("/api/agente/mensagens", { method: "POST", body: json({ texto, canal: "voz" }) }),
    onSuccess: (r) => {
      setPropostas(r.propostas);
      if (!r.propostas.length) toast(r.resposta);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const decidir = useMutation({
    mutationFn: ({ id, acao }: { id: number; acao: "confirmar" | "rejeitar" }) =>
      api<PropostaAgente>(`/api/agente/propostas/${id}/${acao}`, { method: "POST", body: acao === "confirmar" ? json({}) : undefined }),
    onSuccess: (p) => {
      setPropostas((ps) => ps.map((x) => (x.id === p.id ? p : x)));
      if (p.status === "confirmada") {
        if ("vibrate" in navigator) navigator.vibrate?.(30);
        toast.success("Registrado!");
        atualizar();
      }
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const voz = useVoz((t) => {
    setTextoAgente(t);
    if (t) perguntar.mutate(t);
  });
  const onBuscar = useCallback((q: string) => setBusca(q), []);

  return (
    <>
      <h1 className="font-display text-h2 font-bold leading-tight">Cliente procurou e não encontrou</h1>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">Fale ou toque. Sem dados pessoais do cliente.</p>

      {/* Voz → agente */}
      <section aria-label="Registrar por voz" className="mb-6 rounded-lg border border-violeta-300/60 bg-violeta-50/60 p-4 dark:bg-violeta-900/20">
        <div className="flex items-center gap-3">
          <VozButton ouvindo={voz.ouvindo} suportada={voz.suportada} onIniciar={voz.iniciar} onParar={voz.parar} />
          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (textoAgente.trim().length > 2) perguntar.mutate(textoAgente.trim());
            }}
          >
            <label htmlFor="frase" className="sr-only">Frase para o agente</label>
            <input
              id="frase"
              value={voz.ouvindo ? voz.parcial : textoAgente}
              onChange={(e) => setTextoAgente(e.target.value)}
              placeholder={voz.suportada ? "Toque no microfone e fale…" : "Escreva: procurou calça 42, uns 40 anos, não tinha"}
              className="h-12 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm"
              autoComplete="off"
            />
            <button type="submit" className="grid size-12 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted" aria-label="Enviar frase">
              <Keyboard className="size-5" />
            </button>
          </form>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: “procurou calça jeans 42, uns 40 anos, não tinha”. {perguntar.isPending && "Interpretando…"}
        </p>
        {voz.erro && <p role="alert" className="mt-2 text-xs text-erro-tx dark:text-erro">{voz.erro}</p>}
        {voz.suportada && (
          <p className="mt-1 flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
            A transcrição é feita pelo navegador (alguns enviam o áudio ao serviço de voz deles). O MidiaComercial recebe só o texto e não guarda áudio.
          </p>
        )}
        <div aria-live="polite" className="mt-3 flex flex-col gap-3 empty:hidden">
          {propostas.map((p) => (
            <PropostaCard
              key={p.id}
              proposta={p}
              ocupado={decidir.isPending && decidir.variables?.id === p.id}
              onConfirmar={() => decidir.mutate({ id: p.id, acao: "confirmar" })}
              onRejeitar={() => decidir.mutate({ id: p.id, acao: "rejeitar" })}
            />
          ))}
        </div>
      </section>

      <p className="overline mb-3 text-muted-foreground">Ou pelos botões</p>
      <DemandQuickForm
        resultados={busca.length >= 2 ? (catalogo.data ?? []) : []}
        buscando={catalogo.isFetching}
        onBuscar={onBuscar}
        onRegistrar={(d) => registrar.mutateAsync(d)}
        enviando={registrar.isPending}
        ultimo={ultimo}
        onDesfazer={(id) => desfazer.mutate(id)}
      />

      {!!recentes.data?.length && (
        <section className="mt-8">
          <p className="overline mb-2 text-muted-foreground">Seus últimos registros</p>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {recentes.data.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{d.rotulo}</span>{" "}
                  <span className="text-muted-foreground">
                    · {d.motivo_rotulo.toLowerCase()}
                    {d.faixa_etaria && ` · ${rotuloFaixa(d.faixa_etaria)}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">{hora(d.registrado_em)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
