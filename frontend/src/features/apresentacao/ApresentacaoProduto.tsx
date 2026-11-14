// Moldura da demonstração da página inicial (melhoria-design §3–§6).
// Percurso principal: balcão por voz. Segundo: pós-venda, marcado como fluxo em evolução.
// Carregado sob demanda pela HomePage. Nada aqui chama o backend nem envia mensagem.
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PalcoBalcao } from "./PalcoBalcao";
import { PalcoPosVenda } from "./PalcoPosVenda";
import { useRelogio } from "./useRelogio";

type Percurso = "balcao" | "posvenda";

const ehCampo = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export default function ApresentacaoProduto({ pedidoInicio = 0 }: { pedidoInicio?: number }) {
  const r = useRelogio();
  const [percurso, setPercurso] = useState<Percurso>("balcao");
  const [ampliado, setAmpliado] = useState(false);
  const palco = useRef<HTMLElement>(null);
  const origemFoco = useRef<HTMLElement | null>(null);

  // CTA do hero ("Assistir à demonstração"): começa o balcão com som (veio de um clique)
  const { tocar, pausar } = r;
  useEffect(() => {
    if (pedidoInicio > 0) {
      setPercurso("balcao");
      tocar(true);
    }
  }, [pedidoInicio, tocar]);

  // Fora da tela: pausa. Rolar a página nunca avança nem volta o áudio.
  useEffect(() => {
    const el = palco.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([en]) => en && !en.isIntersecting && pausar(), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [pausar]);

  const abrirAmpliado = () => {
    origemFoco.current = document.activeElement as HTMLElement | null;
    setAmpliado(true);
  };
  const fecharAmpliado = () => {
    setAmpliado(false);
    requestAnimationFrame(() => origemFoco.current?.focus()); // foco volta a quem abriu
  };

  useEffect(() => {
    if (!ampliado) return;
    const sair = (ev: KeyboardEvent) => ev.key === "Escape" && fecharAmpliado();
    window.addEventListener("keydown", sair);
    return () => window.removeEventListener("keydown", sair);
  }, [ampliado]);

  const teclas = (ev: React.KeyboardEvent) => {
    if (percurso !== "balcao" || ehCampo(ev.target)) return;
    if (ev.key === " " && !(ev.target instanceof HTMLButtonElement)) {
      ev.preventDefault();
      if (r.status === "tocando") r.pausar();
      else if (r.status !== "aguardando") r.tocar();
    } else if (ev.key.toLowerCase() === "r") r.recomecar();
  };

  const trocar = (p: Percurso) => {
    r.pausar();
    setPercurso(p);
  };

  return (
    <>
      {ampliado && <div className="fixed inset-0 z-sobre bg-tinta-950/85 backdrop-blur-sm" aria-hidden onClick={fecharAmpliado} />}
      <section
        ref={palco}
        id="percurso"
        aria-label="Demonstração do MidiaComercial"
        onKeyDown={teclas}
        className={cn(
          "scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-background/90 text-foreground shadow-[0_30px_80px_-30px_rgb(11_16_32/0.6)] backdrop-blur",
          ampliado && "fixed inset-3 z-dialogo overflow-y-auto bg-background sm:inset-6",
        )}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3">
          <div role="tablist" aria-label="Percurso" className="flex rounded-lg bg-muted p-1">
            {(
              [
                ["balcao", "Balcão por voz"],
                ["posvenda", "Pós-venda"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={percurso === id}
                onClick={() => trocar(id)}
                className={cn(
                  "h-9 whitespace-nowrap rounded-md px-2.5 text-sm font-medium transition-colors sm:px-3",
                  percurso === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {rotulo}
                {id === "posvenda" && (
                  <span className="ml-1.5 text-[11px] text-neon-700 dark:text-neon-500">
                    <span className="sm:hidden" aria-hidden>•</span>
                    <span className="max-sm:sr-only">em evolução</span>
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Loja Exemplo · voz sintética</span>
          <Badge tom="violeta" className="ml-auto">Demonstração · dados fictícios</Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={ampliado ? fecharAmpliado : abrirAmpliado}
            aria-label={ampliado ? "Sair da apresentação" : "Modo apresentação"}
            className="hidden md:inline-flex"
          >
            {ampliado ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>
        </header>

        {percurso === "balcao" ? <PalcoBalcao r={r} /> : <PalcoPosVenda />}
      </section>
    </>
  );
}
