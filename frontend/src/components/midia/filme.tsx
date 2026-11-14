// Prévia animada (animatic) do filme de 40 s — roteiro em docs/19-ROTEIRO-FILME-32S.md.
// Ideia: o sistema da loja sozinho não guarda a procura; com a nossa camada ao lado, a mesma conversa
// vira registro, números, contato com cliente e próximo passo. Não é vídeo: é a interface desenhada.
// O estado depende apenas do tempo `t` (voltar, pausar e recomeçar reconstroem a cena; nada é somado).
import { BadgeCheck, CircleSlash, FileSpreadsheet, Pause, Play, RotateCcw, Sparkles, UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export const DURACAO_FILME = 40;

/** Cenas do roteiro: início (s), título na tela e legenda (o que a pessoa lê, já que não há áudio). */
export const CENAS_FILME = [
  { de: 0, titulo: "O cliente pediu. Não tinha.", legenda: "Uma procura no balcão, num dia corrido." },
  { de: 4, titulo: "Só com o sistema da loja", legenda: "O caixa registra o que vendeu. A procura não tem onde ficar." },
  { de: 8, titulo: "Com o MidiaComercial ao lado", legenda: "Funcionária: “Procuraram calça jeans azul, tamanho 42, e não tinha.”" },
  { de: 12, titulo: "O agente de IA preenche os dados", legenda: "Ninguém digita: a fala vira produto, cor, tamanho e motivo." },
  { de: 17, titulo: "Uma pessoa confirma", legenda: "Funcionária: “Confere. Pode registrar.”" },
  { de: 20, titulo: "A loja volta a esse sinal", legenda: "De 5 para 6 procuras nos últimos 7 dias. O saldo vem da planilha da loja." },
  { de: 25, titulo: "Os números da semana, prontos", legenda: "Vendas, receita e ticket médio saem da planilha. Sem digitar nada." },
  { de: 30, titulo: "O agente vai atrás dos clientes", legenda: "Ele acha quem autorizou contato e escreve a mensagem. O vendedor revisa e envia." },
  { de: 35, titulo: "Um próximo passo, com motivo", legenda: "Sua equipe conversa. A IA organiza. A loja decide." },
] as const;

export function cenaEm(t: number) {
  let i = 0;
  CENAS_FILME.forEach((c, k) => {
    if (t >= c.de) i = k;
  });
  return i;
}

const VELOCIDADES = [1, 1.5, 2] as const;
const CAMPOS = [
  { rotulo: "Produto", valor: "Calça jeans", em: 12.8 },
  { rotulo: "Cor", valor: "Azul", em: 13.7 },
  { rotulo: "Tamanho", valor: "42", em: 14.6 },
  { rotulo: "Motivo", valor: "Item indisponível", em: 15.5 },
];
const DIAS = [1, 0, 1, 1, 0, 2, 0]; // 5 procuras anteriores; a nova entra no último dia (total 6)
// Números ilustrativos da mesma loja fictícia (7 dias): 80 vendas, R$ 12.800, ticket R$ 160, Calças 37,5%
const METRICAS = [
  { rotulo: "Vendas", fim: 80, fmt: (v: number) => String(Math.round(v)) },
  { rotulo: "Receita", fim: 12800, fmt: (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}` },
  { rotulo: "Ticket médio", fim: 160, fmt: (v: number) => `R$ ${Math.round(v)}` },
  { rotulo: "Calças na receita", fim: 37.5, fmt: (v: number) => `${v.toFixed(1).replace(".", ",")}%` },
];
const MENSAGEM = "Oi, Ana! Chegou a camisa social branca no seu tamanho. Quer que eu separe uma para você?";
const CLIENTES = ["AN", "BR", "CS"];

/** progresso 0–1 entre dois instantes, com saída suave */
function prog(t: number, de: number, dur: number) {
  const x = Math.min(1, Math.max(0, (t - de) / dur));
  return 1 - (1 - x) ** 3;
}

/** Aparece quando `on` (opacidade + deslocamento curto + foco). */
function Entra({ on, children, className }: { on: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden={!on} className={cn("transition-all duration-500 ease-out", on ? "translate-y-0 opacity-100 blur-0" : "pointer-events-none translate-y-3 opacity-0 blur-[3px]", className)}>
      {children}
    </div>
  );
}

function tempo(s: number) {
  return `0:${String(Math.floor(s)).padStart(2, "0")}`;
}

export function FilmeAnimado({ inicial = 0 }: { inicial?: number }) {
  const menos = useMenosMovimento();
  const [t, setT] = useState(inicial);
  const [tocando, setTocando] = useState(false);
  const [vel, setVel] = useState<(typeof VELOCIDADES)[number]>(1);
  const raiz = useRef<HTMLDivElement>(null);
  // pausa pedida pela pessoa (ou posição escolhida no link): a rolagem não retoma por conta própria
  const pausaManual = useRef(inicial > 0);
  const fim = t >= DURACAO_FILME;

  // relógio único: avança só enquanto toca, na velocidade escolhida; para no fim (sem loop)
  useEffect(() => {
    if (!tocando) return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const agora = performance.now();
      const passo = ((agora - ultimo) / 1000) * vel;
      ultimo = agora;
      setT((v) => {
        const n = Math.min(DURACAO_FILME, v + passo);
        if (n >= DURACAO_FILME) setTocando(false);
        return n;
      });
    }, 80);
    return () => window.clearInterval(id);
  }, [tocando, vel]);

  // começa sozinho ao entrar na tela (não tem som); pausa ao sair ou ao ocultar a aba.
  // Com "menos movimento", espera o clique.
  useEffect(() => {
    const parar = () => document.hidden && setTocando(false);
    document.addEventListener("visibilitychange", parar);
    const io =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([e]) => {
              if (!e.isIntersecting) setTocando(false);
              else if (!menos && !pausaManual.current) setTocando(true);
            },
            { threshold: 0.45 },
          );
    if (raiz.current) io?.observe(raiz.current);
    return () => {
      document.removeEventListener("visibilitychange", parar);
      io?.disconnect();
    };
  }, [menos]);

  const c = cenaEm(t);
  const cena = CENAS_FILME[c];
  const comCamada = t >= 8;
  const perdida = t >= 6.4 && t < 8;
  const registrado = t >= 18.6;
  const total = t >= 21.5 ? 6 : 5;
  const vista = t < 20 ? "conversa" : t < 25 ? "sinal" : t < 30 ? "metricas" : t < 35 ? "agente" : "acao";
  const preenchendo = t >= 12 && t < 16.2;
  const letras = Math.round(prog(t, 32, 2.4) * MENSAGEM.length);

  const alternar = () => {
    if (tocando) {
      pausaManual.current = true;
      setTocando(false);
    } else {
      pausaManual.current = false;
      if (fim) setT(0);
      setTocando(true);
    }
  };
  const reiniciar = () => {
    pausaManual.current = false;
    setT(0);
    setTocando(true);
  };

  return (
    <div ref={raiz} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0b1020] text-white max-sm:rounded-2xl">
      {/* palco */}
      <div className="relative isolate flex min-h-[520px] flex-col gap-4 p-4 sm:p-6 lg:aspect-video lg:min-h-0 lg:p-8">
        <span className="filme-aura pointer-events-none absolute -right-24 -top-24 -z-10 size-[420px] rounded-full" aria-hidden />

        {/* trilha das cenas */}
        <ol className="flex gap-1" aria-hidden>
          {CENAS_FILME.map((x, i) => {
            const ate = CENAS_FILME[i + 1]?.de ?? DURACAO_FILME;
            return (
              <li key={x.de} className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-neon-500" style={{ width: `${Math.min(1, Math.max(0, (t - x.de) / (ate - x.de))) * 100}%` }} />
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p key={c} className="filme-entra font-display text-[clamp(1.25rem,2.4vw,2rem)] font-bold leading-tight tracking-tight">
            {cena.titulo}
          </p>
          <p className="tabular text-xs text-[#a8b0c6]">
            Cena {c + 1} de {CENAS_FILME.length}
          </p>
        </div>

        <div className={cn("grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-700 ease-out", comCamada ? "lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]")}>
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

            {/* a procura chega, não acha lugar e some (cenas 1 e 2); depois, a planilha alimenta a camada */}
            <div className={cn("relative mt-4 min-h-[92px] lg:flex-1", comCamada && t < 22.5 && "max-lg:hidden", t >= 22.5 && "max-lg:min-h-[48px]")}>
              <Entra on={t >= 0.6 && t < 8} className="absolute inset-x-0 top-0">
                <p className={cn("max-w-[30ch] rounded-2xl rounded-tl-sm border px-4 py-2.5 text-[15px] leading-6 transition-all duration-700", perdida ? "border-dashed border-white/20 bg-transparent text-white/35 line-through" : "border-transparent bg-white/10")}>
                  Cliente: “Tem calça jeans azul 42?” Não tinha.
                </p>
                <Entra on={perdida} className="mt-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-500 px-2.5 py-1 text-xs font-semibold text-[#0b1020]">A procura ficou sem registro</span>
                </Entra>
              </Entra>
              <Entra on={t >= 22.5} className="absolute inset-x-0 top-0">
                <p className={cn("inline-flex items-center gap-2 rounded-xl border bg-white/5 px-3 py-2 text-sm transition-colors duration-500", t >= 25 && t < 30 ? "border-neon-500/60" : "border-[#2c3652]")}>
                  <FileSpreadsheet className="size-4 shrink-0 text-[#bda7ff]" aria-hidden /> Planilha da loja enviada
                </p>
              </Entra>
            </div>
          </div>

          {/* nossa camada: entra ao lado, sem trocar o sistema da loja */}
          <div className={cn("min-w-0 overflow-hidden transition-opacity duration-700", comCamada ? "opacity-100" : "opacity-0 max-lg:hidden")} aria-hidden={!comCamada}>
            <div className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[20px] border border-[#8b5cf6]/50 bg-[#141c34] p-4 sm:p-5">
              <span key={`varre-${vista}`} className="filme-varre pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#bda7ff]">MidiaComercial · ao lado do caixa</p>

              {vista === "conversa" && (
                <div key="conversa" className="filme-entra mt-3 grid flex-1 content-start gap-3 sm:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2 text-[15px] leading-6">
                    <Entra on={t >= 8.6}>
                      <p className="rounded-2xl rounded-tr-sm bg-[#6d28d9] px-4 py-2.5">
                        “Procuraram <b className={cn("transition-colors", t >= 12.8 && "text-neon-300")}>calça jeans</b>{" "}
                        <b className={cn("transition-colors", t >= 13.7 && "text-neon-300")}>azul</b>, tamanho <b className={cn("transition-colors", t >= 14.6 && "text-neon-300")}>42</b>, e{" "}
                        <b className={cn("transition-colors", t >= 15.5 && "text-neon-300")}>não tinha</b>.”
                      </p>
                    </Entra>
                    <Entra on={t >= 16.2}>
                      <p className="rounded-2xl rounded-tl-sm border border-[#2c3652] bg-white/5 px-4 py-2.5">“Calça jeans azul, 42. Item indisponível. Confere?”</p>
                    </Entra>
                    {t >= 17.4 && <p className="filme-entra rounded-2xl rounded-tr-sm bg-[#6d28d9] px-4 py-2.5">“Confere. Pode registrar.”</p>}
                  </div>
                  <Entra on={t >= 12} className="min-w-0">
                    <div className={cn("rounded-2xl border bg-[#0b1020]/60 p-3 transition-colors duration-500", preenchendo ? "border-neon-500/60" : registrado ? "border-[#70e1b2]/60" : "border-[#2c3652]")}>
                      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-neon-500">
                        <Sparkles className={cn("size-3.5", preenchendo && "filme-pisca")} aria-hidden /> {preenchendo ? "Agente de IA preenchendo…" : "Preenchido pelo agente de IA"}
                      </p>
                      <dl className="flex flex-col gap-1.5 text-sm">
                        {CAMPOS.map((f) => (
                          <div key={f.rotulo} className={cn("flex justify-between gap-3 rounded-lg px-3 py-2 transition-colors duration-300", t >= f.em ? "bg-white/10" : "bg-white/[0.03]")}>
                            <dt className="text-[#a8b0c6]">{f.rotulo}</dt>
                            <dd className={cn("font-semibold transition-all duration-300", t >= f.em ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0")}>{f.valor}</dd>
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
                <div key="sinal" className="filme-entra mt-3 flex flex-1 flex-col gap-4">
                  <p className="text-sm text-[#a8b0c6]">Calça jeans · Azul · 42 · últimos 7 dias</p>
                  <div className="flex flex-wrap items-end gap-6">
                    <p key={total} className="filme-entra tabular font-display text-7xl font-bold leading-none">
                      {total}
                    </p>
                    <p className="pb-2 text-base text-[#a8b0c6]">procuras registradas</p>
                  </div>
                  <ol className="flex h-20 items-end gap-2" aria-label="Procuras por dia">
                    {DIAS.map((d, i) => {
                      const v = i === 6 && total === 6 ? 1 : d;
                      return (
                        <li key={i} className="flex-1 rounded-t-md transition-all duration-500" style={{ height: `${(12 + v * 34) * prog(t, 20 + i * 0.08, 0.6)}%`, background: i === 6 && total === 6 ? "#ff6b4a" : "#8b5cf6", opacity: v ? 1 : 0.25 }} />
                      );
                    })}
                  </ol>
                  <Entra on={t >= 22.5}>
                    <p className="text-sm">
                      Saldo informado: <b>0</b> <span className="text-[#a8b0c6]">· planilha da loja, 09h</span>
                    </p>
                  </Entra>
                </div>
              )}

              {vista === "metricas" && (
                <div key="metricas" className="filme-entra mt-3 flex flex-1 flex-col gap-3">
                  <p className="text-sm text-[#a8b0c6]">Resumo dos últimos 7 dias · preenchido pela planilha</p>
                  <dl className="grid flex-1 grid-cols-2 gap-2.5">
                    {METRICAS.map((m, i) => (
                      <div key={m.rotulo} className={cn("flex flex-col justify-center rounded-2xl border p-3 sm:p-4", i === 2 ? "border-neon-500/60 bg-neon-500/10" : "border-[#2c3652] bg-white/5")}>
                        <dt className="text-xs text-[#a8b0c6] sm:text-sm">{m.rotulo}</dt>
                        <dd className={cn("tabular font-display text-[clamp(1.4rem,2.6vw,2.4rem)] font-bold leading-tight", i === 2 && "text-neon-500")}>{m.fmt(m.fim * prog(t, 25.3 + i * 0.35, 1.6))}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-[#a8b0c6]">Números ilustrativos. Também dá para ver 30 e 90 dias.</p>
                </div>
              )}

              {vista === "agente" && (
                <div key="agente" className="filme-entra mt-3 flex flex-1 flex-col gap-3">
                  <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-neon-500">
                    <Sparkles className="size-4" aria-hidden /> Agente de IA
                  </p>
                  <p className="text-[15px] leading-6">
                    Camisa social branca G <span className="text-[#a8b0c6]">· parada há 45 dias</span>
                  </p>
                  <Entra on={t >= 30.8}>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {CLIENTES.map((n, i) => (
                        <span key={n} className={cn("grid size-9 place-items-center rounded-full bg-[#6d28d9] text-xs font-bold transition-all duration-500", t >= 31 + i * 0.3 ? "scale-100 opacity-100" : "scale-50 opacity-0")}>
                          {n}
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1.5 text-[#a8b0c6]">
                        <UserCheck className="size-4 text-[#70e1b2]" aria-hidden /> 3 clientes autorizaram contato e já compraram camisas
                      </span>
                    </div>
                  </Entra>
                  <Entra on={t >= 32} className="mt-auto">
                    <p className="min-h-[5.5rem] rounded-2xl rounded-tl-sm border border-[#2c3652] bg-white/5 px-4 py-3 text-[15px] leading-6">
                      {MENSAGEM.slice(0, letras)}
                      {letras < MENSAGEM.length && <span className="filme-pisca">▍</span>}
                    </p>
                    <p className={cn("mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-500", t >= 34.4 ? "border-neon-500/60 text-neon-500" : "border-white/15 text-[#a8b0c6]")}>
                      Rascunho · o vendedor revisa e envia
                    </p>
                  </Entra>
                </div>
              )}

              {vista === "acao" && (
                <div key="acao" className="filme-entra mt-3 flex flex-1 flex-col justify-center gap-4">
                  <p className="text-sm text-[#a8b0c6]">Calça jeans azul 42 · 6 procuras · saldo informado 0</p>
                  <p className="font-display text-[clamp(1.4rem,2.6vw,2.25rem)] font-bold leading-[1.15] tracking-tight">Conferir o estoque e consultar o fornecedor.</p>
                  <p className="text-sm text-[#a8b0c6]">São 6 atendimentos, não 6 pessoas nem 6 vendas. Quem decide a compra é a loja.</p>
                  <Entra on={t >= 37.2}>
                    <p className="text-lg font-semibold text-neon-500">Sua equipe conversa. A IA organiza. A loja decide.</p>
                  </Entra>
                </div>
              )}
            </div>
          </div>
        </div>

        <p key={`l${c}`} className="filme-entra min-h-[3rem] text-[15px] leading-6 text-[#f6f7ff]" aria-live="polite">
          {cena.legenda}
        </p>
      </div>

      {/* controles reais, fora do palco */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 px-4 py-3 sm:px-6">
        <button type="button" onClick={alternar} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#0b1020]">
          {tocando ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
          {tocando ? "Pausar" : fim ? "Ver de novo" : "Continuar"}
        </button>
        <button type="button" onClick={reiniciar} aria-label="Reiniciar do início" title="Reiniciar do início" className="grid size-11 place-items-center rounded-xl border border-white/15 text-[#a8b0c6] hover:text-white">
          <RotateCcw className="size-4" aria-hidden />
        </button>
        <input
          type="range"
          min={0}
          max={DURACAO_FILME}
          step={0.5}
          value={t}
          onChange={(e) => {
            pausaManual.current = true;
            setTocando(false);
            setT(Number(e.target.value));
          }}
          aria-label="Posição da prévia"
          aria-valuetext={`${tempo(t)} de ${tempo(DURACAO_FILME)}: ${cena.titulo}`}
          className="h-11 min-w-[140px] flex-1 accent-[#b6ff3b]"
        />
        <span className="tabular text-xs text-[#a8b0c6]">
          {tempo(t)} / {tempo(DURACAO_FILME)}
        </span>
        <div role="group" aria-label="Velocidade" className="flex rounded-xl border border-white/15 p-0.5">
          {VELOCIDADES.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vel === v}
              onClick={() => setVel(v)}
              className={cn("tabular h-9 min-w-11 rounded-[10px] px-2 text-xs font-semibold transition-colors", vel === v ? "bg-neon-500 text-[#0b1020]" : "text-[#a8b0c6] hover:text-white")}
            >
              {String(v).replace(".", ",")}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
