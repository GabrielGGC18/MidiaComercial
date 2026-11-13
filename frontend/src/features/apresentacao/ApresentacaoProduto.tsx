// Palco da página inicial: uma venda fictícia percorre a interface em 6 capítulos
// (ANIMACAO-Tela §4.3, §10). Carregado sob demanda pela HomePage.
import { ArrowRight, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, UserX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";
import { CAPITULOS, DIA_DEMO, LOJA, ULTIMO } from "./cenario";
import { ChatDemonstracao } from "./ChatDemonstracao";
import { PainelResultado } from "./PainelResultado";
import { usePercurso } from "./usePercurso";

const qCelular = "(max-width: 767px)";
const assinar = (cb: () => void) => {
  const m = window.matchMedia?.(qCelular);
  m?.addEventListener("change", cb);
  return () => m?.removeEventListener("change", cb);
};
const useCelular = () => useSyncExternalStore(assinar, () => !!window.matchMedia?.(qCelular).matches, () => false);

const ehCampo = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export default function ApresentacaoProduto({ pedidoInicio = 0 }: { pedidoInicio?: number }) {
  const menos = useMenosMovimento();
  const celular = useCelular();
  // Celular e "menos movimento": avanço manual por padrão (§17, §18)
  const p = usePercurso({ automatico: !menos && !celular });
  const { estado: e, cap, tocando } = p;
  const [ampliado, setAmpliado] = useState(false);
  const [aba, setAba] = useState<"conversa" | "resultado">("resultado");
  const palco = useRef<HTMLElement>(null);

  // CTA do hero ("Ver uma venda acontecer") inicia o percurso
  const iniciar = p.iniciar;
  useEffect(() => {
    if (pedidoInicio > 0) {
      iniciar("principal");
      palco.current?.scrollIntoView({ behavior: menos ? "auto" : "smooth", block: "center" });
    }
  }, [pedidoInicio, iniciar, menos]);

  // Fora da tela: pausa (sem pular capítulos)
  const pausar = p.pausar;
  useEffect(() => {
    const el = palco.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([en]) => en && !en.isIntersecting && pausar(), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [pausar]);

  useEffect(() => {
    if (!ampliado) return;
    const sair = (ev: KeyboardEvent) => ev.key === "Escape" && setAmpliado(false);
    window.addEventListener("keydown", sair);
    return () => window.removeEventListener("keydown", sair);
  }, [ampliado]);

  const alternar = () => (tocando ? p.pausar() : cap >= ULTIMO ? p.reiniciar() : p.continuar());

  // Atalhos só com o foco dentro do palco, e nunca dentro de campo de texto (§10)
  const teclas = (ev: React.KeyboardEvent) => {
    if (ehCampo(ev.target)) return;
    if (ev.key === " " && !(ev.target instanceof HTMLButtonElement)) {
      ev.preventDefault();
      alternar();
    } else if (ev.key === "ArrowRight") p.proximo();
    else if (ev.key === "ArrowLeft") p.anterior();
    else if (ev.key.toLowerCase() === "r") p.reiniciar();
  };

  const capAtual = cap >= 0 ? CAPITULOS[cap] : null;
  const status = cap < 0 ? "Em espera" : e.emRevisao && e.revisao === "pendente" ? "Aguardando sua revisão" : e.revisao === "aprovada" ? "Sugestão revisada" : capAtual!.rotulo;

  return (
    <>
      {ampliado && <div className="fixed inset-0 z-40 bg-tinta-950/80 backdrop-blur-sm" aria-hidden onClick={() => setAmpliado(false)} />}
      <section
        ref={palco}
        id="percurso"
        aria-label="Demonstração: uma venda do começo ao fim"
        onKeyDown={teclas}
        className={cn(
          "flex scroll-mt-20 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-[0_24px_60px_-24px_rgb(11_16_32/0.55)]",
          ampliado && "fixed inset-3 z-50 sm:inset-6",
        )}
      >
        {/* 1. Barra superior */}
        <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
          <span className="font-display text-sm font-bold">{LOJA}</span>
          <span className="text-xs text-muted-foreground">{DIA_DEMO}</span>
          <span className="text-xs font-semibold text-violeta-700 dark:text-violeta-300">· {status}</span>
          <Badge tom="violeta" className="ml-auto">Demonstração · dados fictícios</Badge>
        </header>

        {/* 2. Índice de capítulos */}
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
                    i === cap
                      ? "bg-violeta-500 text-white"
                      : i < cap
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className={cn("grid size-5 place-items-center rounded-sm text-[11px] font-bold", i === cap ? "bg-white/20" : "bg-muted")}>{i + 1}</span>
                  {c.rotulo}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Celular: um conteúdo por vez */}
        <div className="flex border-b border-border md:hidden" role="tablist" aria-label="Ver">
          {(["resultado", "conversa"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={cn("h-11 flex-1 text-sm font-medium", aba === a ? "border-b-2 border-violeta-500 text-foreground" : "text-muted-foreground")}
            >
              {a === "resultado" ? "Resultado" : `Conversa (${e.falas.length})`}
            </button>
          ))}
        </div>

        {/* 3. Área central: conversa 40% · resultado 60% */}
        <div className={cn("grid min-h-0 md:grid-cols-[2fr_3fr]", ampliado ? "flex-1" : "h-[540px] md:h-[500px]")}>
          <div className={cn("min-h-0 border-border md:block md:border-r", aba === "conversa" ? "block" : "hidden")}>
            <ChatDemonstracao falas={e.falas} preparando={tocando && cap < ULTIMO} />
          </div>
          <div className={cn("min-h-0 overflow-y-auto p-4 md:block", aba === "resultado" ? "block" : "hidden")}>
            {cap < 0 ? (
              <div className="grid h-full place-items-center text-center">
                <div className="max-w-sm">
                  <p className="font-display text-h3 font-bold">VEN-2048 · Boné preto · R$ 89,90</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Veja como esta venda vira histórico, indicador e uma sugestão de pós-venda que o vendedor revisa.
                  </p>
                  <Button className="mt-4" onClick={() => p.iniciar("principal")}>
                    <Play aria-hidden /> Começar
                  </Button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <PainelResultado key={cap <= 2 ? "registro" : cap === 3 ? "indicadores" : "sugestao"} p={p} />
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* 4. Barra inferior: legenda + controles */}
        <footer className="flex flex-col gap-2 border-t border-border px-4 py-2.5 sm:flex-row sm:items-center">
          <p className="min-h-5 flex-1 text-sm font-medium" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.span key={cap} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {capAtual ? capAtual.legenda : "Pronto para começar."}
              </motion.span>
            </AnimatePresence>
          </p>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={p.anterior} disabled={cap <= 0} aria-label="Capítulo anterior">
              <ChevronLeft aria-hidden />
            </Button>
            <Button size="icon" variant="secondary" onClick={alternar} aria-label={tocando ? "Pausar" : cap >= ULTIMO ? "Recomeçar" : "Reproduzir"}>
              {tocando ? <Pause aria-hidden /> : <Play aria-hidden />}
            </Button>
            <Button size="icon" variant="ghost" onClick={p.proximo} disabled={cap >= ULTIMO} aria-label="Próximo capítulo">
              <ChevronRight aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" onClick={p.reiniciar} disabled={cap < 0} aria-label="Recomeçar">
              <RotateCcw aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setAmpliado((v) => !v)} aria-label={ampliado ? "Sair da apresentação" : "Modo apresentação"} className="hidden md:inline-flex">
              {ampliado ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            </Button>
          </div>
        </footer>
      </section>

      {/* Depois do percurso: cenário secundário e acesso à demonstração autenticada */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <Button variant="secondary" size="sm" onClick={() => p.iniciar(p.cenario === "principal" ? "sem-cliente" : "principal")}>
          <UserX aria-hidden /> {p.cenario === "principal" ? "Ver uma venda sem cliente identificado" : "Voltar à venda com cliente"}
        </Button>
        <Link to="/login" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 font-medium text-violeta-700 hover:bg-muted dark:text-violeta-300">
          Explorar o painel <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </>
  );
}
