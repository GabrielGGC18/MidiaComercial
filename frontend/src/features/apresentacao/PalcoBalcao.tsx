// Palco principal: funcionário fala, assistente confere, registro entra, gráfico e decisão aparecem.
// Um foco por momento; sem rolagem interna (melhoria-design §3 e §4).
import { Check, CheckCircle2, Mic, Pause, Play, RotateCcw, TriangleAlert, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioMensagem } from "./AudioMensagem";
import { DIAS, inicioDe, ITEM, LIMITACAO, MARCOS, SALDO_INFORMADO, TOTAL_MS } from "./cenario-balcao";
import { ValorNarrado } from "./PainelResultado";
import { type EstadoBalcao, estadoBalcao, type FalaVisivel } from "./seletores-balcao";
import type { Relogio } from "./useRelogio";

const surge = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.3, ease: "easeOut" } } as const;

function Bolha({ f, tocando }: { f: FalaVisivel; tocando: boolean }) {
  const func = f.autor === "funcionario";
  return (
    <motion.li {...surge} layout="position" className={cn("flex flex-col gap-1", func ? "items-end" : "items-start")}>
      <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {func ? "Funcionário" : "Assistente"}
      </span>
      <div
        className={cn(
          "w-[min(100%,26rem)] rounded-2xl border px-3.5 py-2.5",
          func
            ? "rounded-tr-sm border-violeta-500/30 bg-violeta-500 text-white"
            : "rounded-tl-sm border-border bg-card text-foreground",
          !f.atual && "opacity-70",
        )}
      >
        <AudioMensagem picos={f.picos} progresso={f.progresso} duracaoMs={f.duracaoMs} tocando={tocando && f.atual && f.progresso < 1} />
        <p className="mt-1.5 text-base leading-6">{f.texto}</p>
      </div>
    </motion.li>
  );
}

function Conversa({ e, tocando }: { e: EstadoBalcao; tocando: boolean }) {
  const [verTudo, setVerTudo] = useState(false);
  const anteriores = e.falas.length > 3 ? e.falas.slice(0, -3) : [];
  const recentes = e.falas.slice(-3);
  return (
    <div className="flex flex-col gap-3">
      {anteriores.length > 0 && (
        <button type="button" onClick={() => setVerTudo((v) => !v)} className="self-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          {verTudo ? "Esconder mensagens anteriores" : `Ver ${anteriores.length} mensagens anteriores`}
        </button>
      )}
      <ul className="flex flex-col gap-3" aria-label="Conversa">
        <AnimatePresence initial={false}>
          {(verTudo ? e.falas : recentes).map((f) => (
            <Bolha key={f.id} f={f} tocando={tocando} />
          ))}
        </AnimatePresence>
      </ul>
      {!e.comecou && (
        <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          <Mic className="size-4 text-violeta-500" aria-hidden /> O funcionário vai registrar uma procura falando com o assistente.
        </p>
      )}
    </div>
  );
}

function CampoProposta({ rotulo, valor, visivel }: { rotulo: string; valor: string; visivel: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className={cn("text-base font-semibold transition-all duration-300", visivel ? "text-foreground" : "translate-y-1 text-transparent")}>
        {visivel && <span className="mr-2 inline-block size-1.5 -translate-y-0.5 rounded-full bg-coral-500" aria-hidden />}
        {valor}
      </dd>
    </div>
  );
}

function Resultado({ e, r }: { e: EstadoBalcao; r: Relogio }) {
  const [acaoCriada, setAcaoCriada] = useState(false);
  const [evidencias, setEvidencias] = useState(false);
  useEffect(() => {
    if (e.foco !== "decisao") {
      setAcaoCriada(false);
      setEvidencias(false);
    }
  }, [e.foco]);

  const dados = DIAS.map((d, i) => ({ dia: d, n: e.procuras[i] ?? 0 }));

  return (
    <motion.div layout className="flex flex-col gap-4">
      {/* 1. Registro: aparece enquanto o assistente confere */}
      <motion.section layout transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }} aria-label="Registro da procura" className={cn("rounded-xl border bg-card p-4 transition-colors", e.foco === "proposta" || e.foco === "confirmar" ? "border-violeta-500/60" : "border-border")}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Procura no balcão</p>
          {e.registrado ? (
            <Badge tom="ok"><CheckCircle2 aria-hidden /> Registrado</Badge>
          ) : e.comecou ? (
            <Badge tom="atencao">Para conferir</Badge>
          ) : (
            <Badge>Aguardando fala</Badge>
          )}
        </div>
        <dl>
          <CampoProposta rotulo="Produto" valor={ITEM.produto} visivel={e.camposVisiveis >= 1} />
          <CampoProposta rotulo="Cor" valor={ITEM.cor} visivel={e.camposVisiveis >= 2} />
          <CampoProposta rotulo="Tamanho" valor={ITEM.tamanho} visivel={e.camposVisiveis >= 3} />
          <CampoProposta rotulo="Motivo" valor={ITEM.motivo} visivel={e.camposVisiveis >= 4} />
        </dl>
        {e.foco === "confirmar" && (
          <motion.div {...surge} className="mt-3 flex flex-col gap-2 rounded-lg bg-violeta-50 p-3 dark:bg-violeta-900/30 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm">Os dados conferem? Nada é gravado sem confirmação.</p>
            <Button onClick={r.confirmar} autoFocus>
              <Check aria-hidden /> Confirmar registro
            </Button>
          </motion.div>
        )}
      </motion.section>

      {/* 2. Número e gráfico: só depois de registrado */}
      <AnimatePresence>
        {e.registrado && (
          <motion.section layout {...surge} aria-label="Procuras desse item" className={cn("rounded-xl border bg-card p-4", e.foco === "registro" || e.foco === "grafico" ? "border-violeta-500/60" : "border-border")}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Procuras sem estoque · últimos 7 dias</p>
                <p className="font-display text-4xl font-extrabold">
                  <ValorNarrado valor={e.total} formatar={(v) => String(Math.round(v))} />
                  <span className="ml-2 text-sm font-medium text-muted-foreground">antes: {e.totalAntes}</span>
                </p>
              </div>
              {e.foco !== "registro" && (
                <p className="flex min-w-0 max-w-full items-start gap-2 rounded-lg bg-sinal-atencao-bg px-3 py-2 text-sm text-sinal-atencao-tx dark:bg-sinal-atencao/15 dark:text-sinal-atencao">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {SALDO_INFORMADO.produto}: saldo {SALDO_INFORMADO.valor}
                    </span>
                    <span className="block text-xs opacity-90">
                      {SALDO_INFORMADO.origem} · importada {SALDO_INFORMADO.importadoEm}
                    </span>
                  </span>
                </p>
              )}
            </div>
            <div className="mt-3 h-28" role="img" aria-label={`Procuras por dia: ${dados.map((d) => `${d.dia} ${d.n}`).join(", ")}`}>
              <ResponsiveContainer>
                <BarChart data={dados} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="dia" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Bar dataKey="n" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={36}>
                    {dados.map((d, i) => (
                      <Cell key={d.dia} fill={i === dados.length - 1 ? "var(--chart-2)" : "var(--chart-1)"} />
                    ))}
                    <LabelList dataKey="n" position="top" fontSize={11} fill="var(--color-muted-foreground)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Hoje (14/11) em coral: o registro que acabou de entrar.</p>
          </motion.section>
        )}
      </AnimatePresence>

      {/* 3. Decisão */}
      <AnimatePresence>
        {e.foco === "decisao" && (
          <motion.section layout {...surge} aria-label="O que fazer" className="rounded-xl border border-l-[3px] border-border border-l-coral-500 bg-card p-4">
            <p className="sobretitulo text-muted-foreground">Falta no estoque</p>
            <p className="mt-1 font-display text-lg font-bold">Repor calça jeans azul 42?</p>
            <p className="mt-2 text-sm"><span className="font-semibold">O que fazer:</span> conferir o estoque físico e consultar o fornecedor antes de comprar.</p>
            <p className="mt-2 flex gap-1.5 text-xs text-sinal-atencao-tx dark:text-sinal-atencao">
              <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> {LIMITACAO}
            </p>
            {evidencias && (
              <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
                <li>Balcão · 6 procuraram e não tinha · 08–14/11</li>
                <li>Estoque · saldo informado 0 · importado {SALDO_INFORMADO.importadoEm}</li>
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {acaoCriada ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sinal-ok-tx dark:text-sinal-ok">
                  <CheckCircle2 className="size-4" aria-hidden /> Ação criada (demonstração)
                </span>
              ) : (
                <Button size="sm" onClick={() => setAcaoCriada(true)}>Criar ação</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setEvidencias((v) => !v)} aria-expanded={evidencias}>
                {evidencias ? "Esconder evidências" : "Ver evidências"}
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PalcoBalcao({ r }: { r: Relogio }) {
  // "pronto" = nada aconteceu ainda (posição 0 já contaria como a 1ª fala)
  const e = estadoBalcao(r.status === "pronto" ? -1 : r.pos, r.confirmado);
  const tocando = r.status === "tocando";
  const marcoAtual = MARCOS.reduce((acc, m, i) => (r.pos >= inicioDe(m.id) ? i : acc), -1);

  return (
    <div className="flex flex-col">
      {/* Controles do percurso */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {r.status === "pronto" ? (
          <>
            <Button onClick={() => r.tocar(true)}>
              <Volume2 aria-hidden /> Ouvir apresentação
            </Button>
            <Button variant="ghost" onClick={() => r.tocar(false)}>Assistir sem som</Button>
          </>
        ) : (
          <>
            <Button size="icon" variant="secondary" onClick={tocando ? r.pausar : r.status === "fim" ? r.recomecar : () => r.tocar()} aria-label={tocando ? "Pausar" : r.status === "fim" ? "Recomeçar" : "Continuar"} disabled={r.status === "aguardando"}>
              {tocando ? <Pause aria-hidden /> : <Play aria-hidden />}
            </Button>
            <Button size="icon" variant="ghost" onClick={r.alternarSom} aria-label={r.som ? "Desligar som" : "Ligar som"} aria-pressed={r.som}>
              {r.som ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
            </Button>
            <Button size="icon" variant="ghost" onClick={r.recomecar} aria-label="Recomeçar">
              <RotateCcw aria-hidden />
            </Button>
          </>
        )}
        {/* progresso clicável: marcos só pulam o relógio */}
        <div className="order-last flex w-full items-center gap-1 sm:order-none sm:ml-2 sm:w-auto sm:flex-1">
          {MARCOS.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => r.irPara(inicioDe(m.id))}
              aria-current={i === marcoAtual ? "step" : undefined}
              className="group flex min-h-11 flex-1 flex-col justify-center gap-1 text-left sm:min-h-9"
            >
              <span className="h-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full bg-violeta-500"
                  style={{
                    width: `${Math.max(0, Math.min(1, (r.pos - inicioDe(m.id)) / ((MARCOS[i + 1] ? inicioDe(MARCOS[i + 1]!.id) : TOTAL_MS) - inicioDe(m.id)))) * 100}%`,
                  }}
                />
              </span>
              <span className={cn("text-[11px] font-medium", i === marcoAtual ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{m.rotulo}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={r.guiado} onChange={(ev) => r.setGuiado(ev.target.checked)} className="size-4 accent-violeta-500" />
          Modo guiado
        </label>
      </div>

      {r.somBloqueado && (
        <p className="border-b border-border bg-sinal-atencao-bg/60 px-4 py-2 text-sm text-sinal-atencao-tx dark:bg-sinal-atencao/10 dark:text-sinal-atencao">
          O navegador bloqueou o som. <button type="button" className="font-semibold underline" onClick={() => r.tocar(true)}>Toque para ouvir</button> ou siga pela legenda.
        </p>
      )}
      {r.guiado && r.confirmado && e.falas.some((f) => f.id === "f-confirma") && (
        <p className="border-b border-border px-4 py-1.5 text-xs text-muted-foreground">Simulação guiada: a confirmação foi feita pelo roteiro, não por você.</p>
      )}

      {/* Conversa (42%) e resultado (58%); no celular, um embaixo do outro */}
      <div className="grid gap-6 p-4 md:grid-cols-[42fr_58fr] md:p-6">
        <Conversa e={e} tocando={tocando} />
        <Resultado e={e} r={r} />
      </div>

      <p className="sr-only" aria-live="polite">
        {e.foco === "confirmar" ? "Aguardando sua confirmação." : e.registrado ? `Registrado. ${e.total} procuras.` : ""}
      </p>
    </div>
  );
}
