import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SendHorizontal, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, json, mensagemErro } from "@/api/client";
import { useAuth } from "@/api/sessao";
import type { PropostaAgente, RespostaAgente } from "@/api/types";
import { PropostaCard, VozButton } from "@/components/midia/agente";
import { Processando } from "@/components/midia/destaques";
import { ListaAoVivo } from "@/components/midia/lista-ao-vivo";
import { temPapel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useVoz } from "@/lib/voz";

type Item = { de: "voce" | "agente"; texto: string; propostas?: PropostaAgente[]; provedor?: string };

const EXEMPLOS_GERENTE = [
  "procurou calça jeans 42, uns 40 anos, não tinha",
  "cadastrar cliente Pedro Alves zap (63) 98877-1122, uns 30 anos, veste M, gosta de calças, autoriza mensagem",
  "quero vender a camisa parada",
  "qual faixa de idade e horário mais compram?",
];
const EXEMPLOS_ATENDENTE = ["procurou camiseta azul M, jovem, sem estoque", "bermuda cinza 40 achou caro"];

/** Painel "Preencher com IA" (docs/01 T8). O agente propõe; nada é gravado sem Confirmar. */
export default function AgenteChat({ className }: { className?: string }) {
  const qc = useQueryClient();
  const { me } = useAuth();
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const fim = useRef<HTMLDivElement>(null);
  // memória curta: a conversa continua no servidor enquanto o painel está aberto
  const sessao = useRef<number | null>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [itens]);

  const enviar = useMutation({
    mutationFn: ({ t, canal }: { t: string; canal: "texto" | "voz" }) =>
      api<RespostaAgente>("/api/agente/mensagens", {
        method: "POST",
        body: json({ texto: t, canal, sessao_id: sessao.current }),
      }),
    onMutate: ({ t }) => setItens((xs) => [...xs, { de: "voce", texto: t }]),
    onSuccess: (r) => {
      sessao.current = r.sessao_id;
      setItens((xs) => [...xs, { de: "agente", texto: r.resposta, propostas: r.propostas, provedor: r.provedor }]);
      if (r.propostas.some((p) => p.tipo === "contato")) void qc.invalidateQueries({ queryKey: ["agente"] });
    },
    onError: (e) => {
      sessao.current = null; // trocou de loja ou a conversa sumiu: recomeça
      setItens((xs) => [...xs, { de: "agente", texto: mensagemErro(e) }]);
    },
  });

  const decidir = useMutation({
    mutationFn: ({ id, acao }: { id: number; acao: "confirmar" | "rejeitar" }) =>
      api<PropostaAgente>(`/api/agente/propostas/${id}/${acao}`, { method: "POST", body: acao === "confirmar" ? json({}) : undefined }),
    onSuccess: (p) => {
      setItens((xs) => xs.map((i) => (i.propostas ? { ...i, propostas: i.propostas.map((x) => (x.id === p.id ? p : x)) } : i)));
      if (p.status === "confirmada") {
        toast.success("Gravado.");
        void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      }
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const mandar = (t: string, canal: "texto" | "voz" = "texto") => {
    const v = t.trim();
    if (v.length < 2 || enviar.isPending) return;
    setTexto("");
    enviar.mutate({ t: v, canal });
  };
  const voz = useVoz((t) => t && mandar(t, "voz"));
  const exemplos = temPapel(me?.papel, "gerente") ? EXEMPLOS_GERENTE : EXEMPLOS_ATENDENTE;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite">
        {itens.length === 0 && (
          <div className="flex flex-col gap-2 py-2">
            <p className="text-sm text-muted-foreground">Fale ou escreva o que aconteceu. Eu preparo o registro e você confirma.</p>
            {exemplos.map((e) => (
              <button key={e} type="button" onClick={() => mandar(e)} className="rounded-sm border border-dashed border-violeta-300 px-3 py-2 text-left text-[13px] hover:bg-violeta-50 dark:hover:bg-violeta-900/30">
                “{e}”
              </button>
            ))}
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {itens.map((i, n) => (
            <li key={n} className={cn("flex flex-col gap-2", i.de === "voce" && "items-end")}>
              <p className={cn("max-w-[90%] rounded-sm border-l-2 px-3 py-2 text-sm", i.de === "voce" ? "border-violeta-900 bg-violeta-500 text-white" : "border-violeta-500 bg-muted")}>
                {i.de === "agente" && <Sparkles className="mr-1.5 inline size-3.5 text-violeta-500" aria-hidden />}
                {i.texto}
              </p>
              {!!i.propostas?.some((p) => p.tipo !== "contato") && (
                <ListaAoVivo
                  className="flex w-full flex-col gap-2"
                  rotulo="Propostas do agente"
                  itens={i.propostas.filter((p) => p.tipo !== "contato")}
                  chave={(p) => p.id}
                  render={(p) => (
                    <PropostaCard
                      proposta={p}
                      ocupado={decidir.isPending && decidir.variables?.id === p.id}
                      onConfirmar={() => decidir.mutate({ id: p.id, acao: "confirmar" })}
                      onRejeitar={() => decidir.mutate({ id: p.id, acao: "rejeitar" })}
                    />
                  )}
                />
              )}
              {i.propostas?.some((p) => p.tipo === "contato") && (
                <a href="/agente" className="text-sm font-medium text-primary hover:underline">Revisar contatos no Agente de vendas →</a>
              )}
            </li>
          ))}
          {enviar.isPending && <li className="text-sm"><Processando>Agente pensando…</Processando></li>}
        </ul>
        <div ref={fim} />
      </div>
      <form
        className="mt-3 flex items-center gap-2 border-t border-border pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          mandar(texto);
        }}
      >
        <VozButton ouvindo={voz.ouvindo} suportada={voz.suportada} onIniciar={voz.iniciar} onParar={voz.parar} className="size-11" />
        <label htmlFor="agente-texto" className="sr-only">Mensagem para o agente</label>
        <input
          id="agente-texto"
          value={voz.ouvindo ? voz.parcial : texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="escreva aqui…"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-md border border-border bg-card px-3 text-sm"
        />
        <button type="submit" aria-label="Enviar" className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-violeta-600 disabled:opacity-50" disabled={enviar.isPending}>
          <SendHorizontal className="size-4" />
        </button>
      </form>
      {voz.erro && <p role="alert" className="mt-1 text-xs text-erro-tx dark:text-erro">{voz.erro}</p>}
    </div>
  );
}
