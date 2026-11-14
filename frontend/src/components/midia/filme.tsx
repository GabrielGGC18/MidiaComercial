// Prévia animada (animatic) do filme de 32 s — roteiro em docs/19-ROTEIRO-FILME-32S.md.
// Ideia: o sistema da loja sozinho não guarda a procura; com a nossa camada ao lado, a mesma conversa
// vira registro, contagem e próximo passo. Não é vídeo: é a interface desenhada, movida por um relógio só.
// O estado depende apenas do tempo `t` (voltar, pausar e recomeçar reconstroem a cena; nada é somado).
import { BadgeCheck, CircleSlash, FileSpreadsheet, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const DURACAO_FILME = 32;

/** Cenas do roteiro: início (s), título na tela e legenda (o que a pessoa lê, já que não há áudio). */
export const CENAS_FILME = [
  { de: 0, titulo: "O cliente pediu. Não tinha.", legenda: "Uma procura no balcão, num dia corrido." },
  { de: 4, titulo: "Só com o sistema da loja", legenda: "O caixa registra o que vendeu. A procura não tem onde ficar." },
  { de: 9, titulo: "Com o MidiaComercial ao lado", legenda: "Funcionária: “Procuraram calça jeans azul, tamanho 42, e não tinha.”" },
  { de: 14, titulo: "A fala vira campos para conferir", legenda: "Assistente: “Calça jeans azul, 42. Item indisponível. Confere?”" },
  { de: 19, titulo: "Uma pessoa confirma", legenda: "Funcionária: “Confere. Pode registrar.”" },
  { de: 22, titulo: "Agora a loja consegue voltar a esse sinal", legenda: "De 5 para 6 procuras nos últimos 7 dias. O saldo vem da planilha da loja." },
  { de: 27, titulo: "Um próximo passo, com motivo", legenda: "Sua equipe conversa. A loja decide." },
] as const;

export function cenaEm(t: number) {
  let i = 0;
  CENAS_FILME.forEach((c, k) => {
    if (t >= c.de) i = k;
  });
  return i;
}

const CAMPOS = [
  { rotulo: "Produto", valor: "Calça jeans", em: 14.6 },
  { rotulo: "Cor", valor: "Azul", em: 15.4 },
  { rotulo: "Tamanho", valor: "42", em: 16.2 },
  { rotulo: "Motivo", valor: "Item indisponível", em: 17 },
];
const DIAS = [1, 0, 1, 1, 0, 2, 0]; // 5 procuras anteriores; a nova entra no último dia (total 6)

/** Aparece quando `on`; sai sem ocupar a leitura (opacidade + deslocamento curto). */
function Entra({ on, children, className }: { on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden={!on} className={cn("transition-all duration-500 ease-out", on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0", className)}>
      {children}
    </div>
  );
}

function tempo(s: number) {
  return `0:${String(Math.floor(s)).padStart(2, "0")}`;
}

export function FilmeAnimado({ inicial = 0 }: { inicial?: number }) {
  const [t, setT] = useState(inicial);
  const [tocando, setTocando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const comecou = t > 0 || tocando;
  const fim = t >= DURACAO_FILME;

  // relógio único: avança só enquanto toca; para no fim (sem loop)
  useEffect(() => {
    if (!tocando) return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const agora = performance.now();
      const passo = (agora - ultimo) / 1000;
      ultimo = agora;
      setT((v) => {
        const n = Math.min(DURACAO_FILME, v + passo);
        if (n >= DURACAO_FILME) setTocando(false);
        return n;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [tocando]);

  // pausa ao sair da tela ou ocultar a aba; não retoma sozinho
  useEffect(() => {
    const parar = () => document.hidden && setTocando(false);
    document.addEventListener("visibilitychange", parar);
    const io = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([e]) => !e.isIntersecting && setTocando(false));
    if (raiz.current) io?.observe(raiz.current);
    return () => {
      document.removeEventListener("visibilitychange", parar);
      io?.disconnect();
    };
  }, []);

  const c = cenaEm(t);
  const cena = CENAS_FILME[c];
  const comCamada = t >= 9;
  const perdida = t >= 6.8 && t < 9;
  const registrado = t >= 20.5;
  const total = t >= 23.5 ? 6 : 5;
  const vista = t < 22 ? "conversa" : t < 27 ? "sinal" : "acao";
  const tocar = () => {
    if (fim) setT(0);
    setTocando(true);
  };

  return (
    <div ref={raiz} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1020] text-white max-sm:rounded-2xl">
      {/* palco */}
      <div className="relative flex min-h-[520px] flex-col gap-4 p-4 sm:p-6 lg:aspect-video lg:min-h-0 lg:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p key={c} className="font-display text-[clamp(1.25rem,2.4vw,2rem)] font-bold leading-tight tracking-tight">
            {cena.titulo}
          </p>
          <p className="tabular text-xs text-[#a8b0c6]">
            Cena {c + 1} de {CENAS_FILME.length}
          </p>
        </div>

        <div className={cn("grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-700 ease-out", comCamada ? "lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]")}>
          {/* sistema da loja: continua igual do começo ao fim */}
          <div className="flex min-w-0 flex-col rounded-[20px] border border-[#2c3652] bg-[#11182c] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a8b0c6]">Sistema da loja · caixa</p>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-[#a8b0c6]">Vendas de hoje</dt>
                <dd className="tabular font-semibold">14</dd>
              </div>
              <div className="flex justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <dt className="text-[#a8b0c6]">Última venda</dt>
                <dd className="whitespace-nowrap font-semibold">Camiseta M</dd>
              </div>
              <div className={cn("flex justify-between gap-3 rounded-lg border border-dashed px-3 py-2 transition-colors duration-500", t >= 4 && !comCamada ? "border-coral-500/70 text-white" : "border-[#2c3652] text-[#a8b0c6]")}>
                <dt>Procuras sem estoque</dt>
                <dd className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold">
                  <CircleSlash className="size-3.5" aria-hidden /> sem campo
                </dd>
              </div>
            </dl>

            {/* a procura chega, não acha lugar e some (cenas 1 e 2) */}
            <div className={cn("relative mt-4 min-h-[92px] lg:flex-1", comCamada && t < 24.5 && "max-lg:hidden", t >= 24.5 && "max-lg:min-h-[48px]")}>
              <Entra on={t >= 0.6 && t < 9} className="absolute inset-x-0 top-0">
                <p className={cn("max-w-[30ch] rounded-2xl rounded-tl-sm border px-4 py-2.5 text-[15px] leading-6 transition-all duration-700", perdida ? "border-dashed border-white/20 bg-transparent text-white/35 line-through" : "border-transparent bg-white/10")}>
                  Cliente: “Tem calça jeans azul 42?” Não tinha.
                </p>
                <Entra on={perdida} className="mt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-2.5 py-1 text-xs font-semibold text-[#0b1020]">A procura ficou sem registro</span>
                </Entra>
              </Entra>
              <Entra on={t >= 24.5} className="absolute inset-x-0 top-0">
                <p className="inline-flex items-center gap-2 rounded-xl border border-[#2c3652] bg-white/5 px-3 py-2 text-sm">
                  <FileSpreadsheet className="size-4 shrink-0 text-[#bda7ff]" aria-hidden /> Planilha de estoque enviada: saldo 0
                </p>
              </Entra>
            </div>
          </div>

          {/* nossa camada: entra ao lado, sem trocar o sistema da loja */}
          <div className={cn("min-w-0 overflow-hidden transition-opacity duration-700", comCamada ? "opacity-100" : "opacity-0 max-lg:hidden")} aria-hidden={!comCamada}>
            <div className="flex h-full min-h-[300px] flex-col rounded-[20px] border border-[#8b5cf6]/50 bg-[#141c34] p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#bda7ff]">MidiaComercial · ao lado do caixa</p>

              {vista === "conversa" && (
                <div className="mt-3 grid flex-1 content-start gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2 text-[15px] leading-6">
                    <Entra on={t >= 9.6}>
                      <p className="rounded-2xl rounded-tr-sm bg-[#6d28d9] px-4 py-2.5">
                        “Procuraram <b className={cn(t >= 11 && "text-[#ffd9cf]")}>calça jeans azul</b>, tamanho <b className={cn(t >= 12 && "text-[#ffd9cf]")}>42</b>, e{" "}
                        <b className={cn(t >= 13 && "text-[#ffd9cf]")}>não tinha</b>.”
                      </p>
                    </Entra>
                    <Entra on={t >= 14}>
                      <p className="rounded-2xl rounded-tl-sm border border-[#2c3652] bg-white/5 px-4 py-2.5">“Calça jeans azul, 42. Item indisponível. Confere?”</p>
                    </Entra>
                    {t >= 19 && <p className="rounded-2xl rounded-tr-sm bg-[#6d28d9] px-4 py-2.5">“Confere. Pode registrar.”</p>}
                  </div>
                  <Entra on={t >= 14.3} className="min-w-0">
                    <div className="rounded-2xl border border-[#2c3652] bg-[#0b1020]/60 p-3">
                      <dl className="flex flex-col gap-1.5 text-sm">
                        {CAMPOS.map((f) => (
                          <div key={f.rotulo} className={cn("flex justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-300", t >= f.em ? "bg-white/10" : "bg-white/[0.03]")}>
                            <dt className="text-[#a8b0c6]">{f.rotulo}</dt>
                            <dd className={cn("font-semibold transition-opacity duration-300", t >= f.em ? "opacity-100" : "opacity-0")}>{f.valor}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className={cn("mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-300", registrado ? "text-[#70e1b2]" : "text-[#a8b0c6]")}>
                        {registrado && <BadgeCheck className="size-4" aria-hidden />}
                        {registrado ? "Registrado (simulação)" : "Para conferir"}
                      </p>
                    </div>
                  </Entra>
                </div>
              )}

              {vista === "sinal" && (
                <div className="mt-3 flex flex-1 flex-col gap-4">
                  <p className="text-sm text-[#a8b0c6]">Calça jeans · Azul · 42 · últimos 7 dias</p>
                  <div className="flex flex-wrap items-end gap-6">
                    <p className="tabular font-display text-7xl font-bold leading-none">{total}</p>
                    <p className="pb-2 text-base text-[#a8b0c6]">procuras registradas</p>
                  </div>
                  <ol className="flex h-20 items-end gap-2" aria-label="Procuras por dia">
                    {DIAS.map((d, i) => {
                      const v = i === 6 && total === 6 ? 1 : d;
                      return (
                        <li key={i} className="flex-1 rounded-t-md transition-all duration-500" style={{ height: `${12 + v * 34}%`, background: i === 6 && total === 6 ? "#ff6b4a" : "#8b5cf6", opacity: v ? 1 : 0.25 }} />
                      );
                    })}
                  </ol>
                  <Entra on={t >= 24.5}>
                    <p className="text-sm">
                      Saldo informado: <b>0</b> <span className="text-[#a8b0c6]">· planilha da loja, 09h</span>
                    </p>
                  </Entra>
                </div>
              )}

              {vista === "acao" && (
                <div className="mt-3 flex flex-1 flex-col justify-center gap-4">
                  <p className="text-sm text-[#a8b0c6]">6 procuras · saldo informado 0</p>
                  <p className="font-display text-[clamp(1.4rem,2.6vw,2.25rem)] font-bold leading-[1.15] tracking-tight">Conferir o estoque e consultar o fornecedor.</p>
                  <p className="text-sm text-[#a8b0c6]">São 6 atendimentos, não 6 pessoas nem 6 vendas. Quem decide a compra é a loja.</p>
                  <Entra on={t >= 29.5}>
                    <p className="text-lg font-semibold text-[#bda7ff]">Sua equipe conversa. A loja decide.</p>
                  </Entra>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="min-h-[3rem] text-[15px] leading-6 text-[#f6f7ff]" aria-live="polite">
          {cena.legenda}
        </p>

        {/* poster: começa só depois do clique */}
        {!comecou && (
          <div className="absolute inset-0 grid place-items-center bg-[#0b1020]/80 p-6 text-center backdrop-blur-[2px]">
            <div>
              <p className="font-display text-[clamp(1.6rem,3.4vw,2.75rem)] font-bold leading-tight tracking-tight">
                O cliente pediu. <span className="text-coral-500">Não tinha.</span>
              </p>
              <p className="mx-auto mt-3 max-w-md text-[#a8b0c6]">Veja o que acontece com essa procura: só com o sistema da loja e com a nossa camada ao lado.</p>
              <button type="button" onClick={tocar} className="mt-6 inline-flex h-13 items-center gap-2 rounded-xl bg-neon-500 px-6 text-base font-bold text-[#0b1020] transition-transform hover:-translate-y-0.5">
                <Play className="size-5" aria-hidden /> Assistir à prévia · 32 s
              </button>
            </div>
          </div>
        )}
      </div>

      {/* controles reais, fora do palco */}
      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => (tocando ? setTocando(false) : tocar())}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0b1020]"
        >
          {tocando ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {tocando ? "Pausar" : fim ? "Assistir de novo" : comecou ? "Continuar" : "Assistir"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTocando(false);
            setT(0);
          }}
          aria-label="Voltar ao início"
          className="grid size-11 place-items-center rounded-xl border border-white/15 text-[#a8b0c6] hover:text-white"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={DURACAO_FILME}
          step={0.5}
          value={t}
          onChange={(e) => {
            setTocando(false);
            setT(Number(e.target.value));
          }}
          aria-label="Posição da prévia"
          aria-valuetext={`${tempo(t)} de ${tempo(DURACAO_FILME)}: ${cena.titulo}`}
          className="h-11 min-w-[140px] flex-1 accent-[#8b5cf6]"
        />
        <span className="tabular text-xs text-[#a8b0c6]">
          {tempo(t)} / {tempo(DURACAO_FILME)}
        </span>
      </div>
    </div>
  );
}
