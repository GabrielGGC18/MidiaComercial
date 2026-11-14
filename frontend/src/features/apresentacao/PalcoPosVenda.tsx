// Segundo percurso: venda → histórico → indicadores → sugestão de pós-venda.
// Fluxo em evolução (PV-07/PV-12): a tela diz isso em todas as cenas.
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Sparkles, UserX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";
import { CAPITULOS, ULTIMO } from "./cenario";
import { ChatDemonstracao } from "./ChatDemonstracao";
import { PainelResultado } from "./PainelResultado";
import { usePercurso } from "./usePercurso";

export function PalcoPosVenda() {
  const menos = useMenosMovimento();
  const p = usePercurso({ automatico: !menos });
  const { estado: e, cap, tocando } = p;
  const capAtual = cap >= 0 ? CAPITULOS[cap] : null;
  const alternar = () => (tocando ? p.pausar() : cap >= ULTIMO ? p.reiniciar() : p.continuar());

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Badge tom="coral"><Sparkles aria-hidden /> Fluxo em evolução</Badge>
        <p className="text-xs text-muted-foreground">Visão do pós-venda planejado. O gatilho por compra recente ainda está em construção.</p>
      </div>

      <nav aria-label="Capítulos" className="border-b border-border px-2 py-2">
        <ol className="flex gap-1 overflow-x-auto">
          {CAPITULOS.map((c, i) => (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => p.irPara(i)}
                aria-current={i === cap ? "step" : undefined}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors md:h-9",
                  i === cap ? "bg-violeta-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className={cn("grid size-5 place-items-center rounded-sm text-[11px] font-bold", i === cap ? "bg-white/20" : "bg-muted")}>{i + 1}</span>
                {c.rotulo}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {cap < 0 ? (
        <div className="grid place-items-center px-4 py-14 text-center">
          <p className="font-display text-h3 font-bold">VEN-2048 · Boné preto · R$ 89,90</p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Veja a venda virar histórico, indicador e uma sugestão de peça complementar que o vendedor revisa.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => p.iniciar("principal")}><Play aria-hidden /> Ver a visão de pós-venda</Button>
            <Button variant="ghost" onClick={() => p.iniciar("sem-cliente")}><UserX aria-hidden /> Venda sem cliente identificado</Button>
          </div>
        </div>
      ) : (
        // Celular: conversa e resultado na mesma sequência vertical, sem abas
        <div className="grid gap-6 p-4 md:grid-cols-[42fr_58fr] md:p-6">
          <div className="rounded-xl border border-border md:max-h-[520px]">
            <ChatDemonstracao falas={e.falas} />
          </div>
          <div>
            <AnimatePresence mode="wait">
              <PainelResultado key={cap <= 2 ? "registro" : cap === 3 ? "indicadores" : "sugestao"} p={p} />
            </AnimatePresence>
          </div>
        </div>
      )}

      <footer className="flex flex-col gap-2 border-t border-border px-4 py-2.5 sm:flex-row sm:items-center">
        <p className="min-h-5 flex-1 text-sm font-medium" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.span key={cap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {capAtual ? capAtual.legenda : "Pronto para começar."}
            </motion.span>
          </AnimatePresence>
        </p>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={p.anterior} disabled={cap <= 0} aria-label="Capítulo anterior"><ChevronLeft aria-hidden /></Button>
          <Button size="icon" variant="secondary" onClick={alternar} disabled={cap < 0} aria-label={tocando ? "Pausar" : cap >= ULTIMO ? "Recomeçar" : "Reproduzir"}>
            {tocando ? <Pause aria-hidden /> : <Play aria-hidden />}
          </Button>
          <Button size="icon" variant="ghost" onClick={p.proximo} disabled={cap < 0 || cap >= ULTIMO} aria-label="Próximo capítulo"><ChevronRight aria-hidden /></Button>
          <Button size="icon" variant="ghost" onClick={p.reiniciar} disabled={cap < 0} aria-label="Recomeçar"><RotateCcw aria-hidden /></Button>
          {cap >= 0 && (
            <Button size="sm" variant="ghost" onClick={() => p.iniciar(p.cenario === "principal" ? "sem-cliente" : "principal")}>
              {p.cenario === "principal" ? "Sem cliente" : "Com cliente"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
