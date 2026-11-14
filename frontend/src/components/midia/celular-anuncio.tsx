// Celular em formato de anúncio (9:16): o app rodando sozinho em laço, com o agente preenchendo os dados.
// Fica ao lado do título no hero. Pausa fora da tela, no botão e com "menos movimento".
import { BadgeCheck, Bot, Check, FileSpreadsheet, Mic, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

const CENAS = [
  { ms: 2600, rotulo: "abertura" },
  { ms: 3200, rotulo: "fala" },
  { ms: 3800, rotulo: "agente" },
  { ms: 2600, rotulo: "confirma" },
  { ms: 3000, rotulo: "sinal" },
  { ms: 3600, rotulo: "relatorio" },
] as const;
const CAMPOS = [
  ["Produto", "Calça jeans"],
  ["Cor", "Azul"],
  ["Tamanho", "42"],
  ["Motivo", "Sem estoque"],
] as const;
const PLANILHA = [
  ["Receita", "R$ 12.800"],
  ["Ticket médio", "R$ 160"],
  ["Mais vendido", "Calças"],
  ["Mais procurado", "Calça azul 42"],
] as const;
const ONDA = [6, 11, 16, 9, 18, 12, 7, 15, 19, 10, 14, 8, 17, 11, 6, 13];

/** Celular 9:16 com o app rodando sozinho em laço, como um anúncio. Pausa fora da tela e com "menos movimento". */
export function CelularAnuncio({ className }: { className?: string }) {
  const menos = useMenosMovimento();
  const [cena, setCena] = useState(menos ? 2 : 0);
  const [dentro, setDentro] = useState(0); // ms dentro da cena
  const [pausado, setPausado] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const rodando = visivel && !pausado && !menos;
  useEffect(() => {
    if (!rodando) return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const agora = performance.now();
      const dt = agora - ultimo;
      ultimo = agora;
      setDentro((d) => d + dt);
    }, 60);
    return () => window.clearInterval(id);
  }, [rodando]);
  // fim da cena: passa para a próxima (em laço)
  useEffect(() => {
    if (dentro < CENAS[cena]!.ms) return;
    setCena((c) => (c + 1) % CENAS.length);
    setDentro(0);
  }, [dentro, cena]);

  const nome = CENAS[cena]!.rotulo;
  const p = menos ? 1 : Math.min(1, dentro / CENAS[cena]!.ms); // progresso 0–1 da cena

  return (
    <div ref={raiz} className={cn("relative mx-auto w-full max-w-[300px]", className)}>
      {/* brilho atrás do aparelho */}
      <span className="brilho-marca pointer-events-none absolute inset-x-0 top-1/4 -z-10 h-2/3" aria-hidden />
      <div className="rounded-[44px] border border-white/15 bg-[#05070f] p-2.5 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(255_255_255/0.04)]">
        <div
          className="celular-tela relative aspect-[9/19] overflow-hidden rounded-[34px] text-white"
          role="img"
          aria-label="Anúncio do MidiaComercial no celular: a fala do balcão vira registro preenchido pelo agente, sinal de reposição e relatório pronto para baixar"
        >
          {/* entalhe */}
          <span className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden />

          {/* barras de progresso (estilo stories) */}
          <ol className="absolute inset-x-4 top-9 z-10 flex gap-1" aria-hidden>
            {CENAS.map((c, i) => (
              <li key={c.rotulo} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
                <span className="block h-full bg-neon-500" style={{ width: `${i < cena ? 100 : i === cena ? p * 100 : 0}%` }} />
              </li>
            ))}
          </ol>
          <p className="absolute inset-x-0 top-14 z-10 text-center text-[11px] font-bold uppercase tracking-[0.18em]">
            MIDIA <span className="text-neon-500">· Comercial</span>
          </p>

          <div key={nome} className="filme-entra absolute inset-x-4 bottom-20 top-24 flex flex-col justify-center">
            {nome === "abertura" && (
              <div className="text-center">
                <p className="font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight">
                  A procura do balcão
                  <br />
                  <span className="text-neon-500">vira próximo passo.</span>
                </p>
                <span className="mx-auto mt-4 block h-1 w-24 rounded-full bg-neon-500" aria-hidden />
                <p className="mt-3 text-sm text-tinta-200">Fale. O agente preenche. Você decide.</p>
              </div>
            )}

            {nome === "fala" && (
              <div className="flex flex-col gap-3">
                <p className="inline-flex items-center gap-1.5 self-end text-[11px] font-semibold uppercase tracking-wide text-tinta-300">
                  <Mic className="size-3.5 text-neon-500" aria-hidden /> Vendedora · gravando
                </p>
                <div className="self-end rounded-2xl rounded-tr-sm bg-violeta-500 px-3.5 py-3">
                  <div className="hero-onda flex h-6 items-center gap-[3px]" aria-hidden>
                    {ONDA.map((h, i) => (
                      <span key={i} className="w-[3px] rounded-full bg-white/90" style={{ height: h, animationDelay: `${(i % 6) * 0.1}s` }} />
                    ))}
                  </div>
                  <p className="mt-2 text-[15px] leading-5">
                    {"“Procuraram calça jeans azul 42 e não tinha.”".slice(0, Math.round(Math.min(1, p * 1.4) * 46))}
                  </p>
                </div>
              </div>
            )}

            {nome === "agente" && (
              <div className="rounded-2xl border border-neon-500/50 bg-[#0d1124]/90 p-3.5">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-neon-500">
                  <Bot className={cn("size-4", p < 0.85 && "filme-pisca")} aria-hidden /> {p < 0.85 ? "Agente preenchendo…" : "Preenchido pelo agente"}
                </p>
                <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                  {CAMPOS.map(([r, v], i) => {
                    const on = p >= 0.12 + i * 0.18;
                    return (
                      <div key={r} className={cn("flex justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors duration-300", on ? "bg-white/10" : "bg-white/[0.04]")}>
                        <dt className="text-tinta-300">{r}</dt>
                        <dd className={cn("font-semibold transition-all duration-300", on ? "opacity-100" : "translate-x-2 opacity-0")}>{v}</dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}

            {nome === "confirma" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-tinta-200">Os dados conferem?</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-bold transition-all duration-300",
                    p < 0.45 ? "bg-neon-500 text-tinta-950" : "scale-95 bg-[#70e1b2] text-tinta-950",
                  )}
                >
                  {p < 0.45 ? <Check className="size-5" aria-hidden /> : <BadgeCheck className="size-5" aria-hidden />}
                  {p < 0.45 ? "Confirmar" : "Registrado"}
                </span>
                <p className="text-xs text-tinta-300">Nada grava sem o toque da vendedora.</p>
              </div>
            )}

            {nome === "sinal" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-tinta-300">Calça jeans azul 42 · 7 dias</p>
                <p className="font-display text-6xl font-extrabold leading-none">
                  {p < 0.35 ? 5 : 6}
                  <span className="ml-2 text-sm font-medium text-tinta-300">procuras</span>
                </p>
                <ol className="flex h-14 items-end gap-1.5" aria-hidden>
                  {[1, 0, 1, 1, 0, 2, 1].map((v, i) => (
                    <li key={i} className={cn("flex-1 rounded-t", i === 6 ? "bg-neon-500" : "bg-violeta-300")} style={{ height: `${(18 + v * 38) * (i === 6 ? Math.min(1, p * 2.5) : 1)}%` }} />
                  ))}
                </ol>
                <p className="rounded-xl bg-white/[0.08] px-3 py-2 text-sm">
                  Repor? <span className="font-semibold text-neon-500">Você decide.</span>
                </p>
              </div>
            )}

            {nome === "relatorio" && (
              <div className="rounded-2xl border border-white/15 bg-[#0d1124]/90">
                <p className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-xs font-semibold">
                  <FileSpreadsheet className="size-3.5 text-neon-500" aria-hidden /> Relatório da semana
                </p>
                <dl className="text-[13px]">
                  {PLANILHA.map(([r, v], i) => {
                    const on = p >= 0.1 + i * 0.16;
                    return (
                      <div key={r} className="flex justify-between gap-2 border-b border-white/10 px-3 py-1.5 last:border-0">
                        <dt className="text-tinta-300">{r}</dt>
                        <dd className={cn("font-semibold transition-opacity duration-300", on ? "opacity-100" : "opacity-0")}>{v}</dd>
                      </div>
                    );
                  })}
                </dl>
                <p className={cn("m-3 rounded-lg py-2 text-center text-xs font-bold transition-colors duration-500", p >= 0.78 ? "bg-neon-500 text-tinta-950" : "bg-white/10 text-tinta-300")}>
                  Baixar planilha preenchida
                </p>
              </div>
            )}
          </div>

          {/* rodapé do anúncio + controle */}
          <p className="absolute bottom-6 left-5 z-10 text-[11px] font-medium text-tinta-300">Feito no Hackrun · NidoQueen</p>
          <button
            type="button"
            onClick={() => setPausado((v) => !v)}
            aria-label={pausado ? "Continuar o anúncio" : "Pausar o anúncio"}
            className="absolute bottom-3.5 right-4 z-10 grid size-10 place-items-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/60"
          >
            {pausado ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}
