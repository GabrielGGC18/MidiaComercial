// Modo apresentação (/apresentar): a página inicial vira slides de tela cheia para o pitch.
// ← → / espaço / PageUp PageDown: navegar · F: tela cheia · N: notas do apresentador · Esc: sair.
// Cada slide reaproveita um capítulo da página e é ajustado (zoom) para caber na altura da tela.
import { ChevronLeft, ChevronRight, Expand, NotebookPen, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { SemanaNaLoja } from "@/components/midia/capitulos";
import { LogoAnimado } from "@/components/midia/marca";
import { FilmeProduto, GradeBeneficios, ProblemaSecao, RotinaLoja } from "@/components/midia/roteiro";
import { FundoEstilhacos } from "@/components/midia/destaques";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

const ApresentacaoProduto = lazy(() => import("@/features/apresentacao/ApresentacaoProduto"));

function Abertura() {
  return (
    <div className="px-3 pt-3">
      <section className="painel-noite relative isolate mx-auto flex min-h-[78vh] w-full max-w-[1280px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/10 px-6 text-center text-white">
        <FundoEstilhacos sempreEscuro className="absolute inset-0 -z-10 opacity-70" />
        <LogoAnimado sobreEscuro />
        <h1 className="titulo-fino mt-8 font-display text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.02]">
          Sua equipe fala.
          <br />
          <span className="text-violeta-300">A loja ganha o próximo passo.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-tinta-300">Inteligência comercial para pequenas e médias lojas de moda e acessórios.</p>
        <p className="mt-10 text-sm text-tinta-100/80">Equipe NidoQueen · Hackrun · Palmas, Tocantins</p>
      </section>
    </div>
  );
}

function Fechamento() {
  return (
    <div className="px-3 pt-3">
      <section className="painel-noite relative isolate mx-auto flex min-h-[78vh] w-full max-w-[1280px] flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/10 px-6 text-center text-white">
        <span className="relative block size-16" aria-hidden>
          <span className="brilho-sinal absolute -inset-6" />
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f6ffe0,var(--color-neon-500)_45%,#2f4a00_100%)] shadow-[0_0_40px_rgb(182_255_59/0.55)]" />
        </span>
        <h2 className="titulo-fino mt-8 font-display text-[clamp(2.4rem,5vw,4.25rem)] font-bold leading-[1.04]">
          Próximo passo:
          <br />
          <span className="text-violeta-300">piloto acompanhado numa loja.</span>
        </h2>
        <ul className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
          {["entrada por arquivo hoje", "dados fictícios na demo", "o vendedor revisa antes de enviar", "resultado medido no piloto"].map((t) => (
            <li key={t} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-10 font-mono text-sm text-tinta-300">midia-comercial.midia63.com.br</p>
        <p className="mt-2 text-lg font-semibold">Obrigado.</p>
      </section>
    </div>
  );
}

function Demonstracao() {
  return (
    <div className="px-3 pt-3">
      <section className="painel-noite mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/10 p-4 sm:p-8">
        <p className="mb-4 text-center text-sm font-medium text-tinta-300">Demonstração · dados fictícios · voz sintética</p>
        <Suspense fallback={<div className="grid h-[520px] place-items-center text-tinta-300">Carregando a demonstração…</div>}>
          <ApresentacaoProduto />
        </Suspense>
      </section>
    </div>
  );
}

// CTAs dentro dos slides levam ao slide da demonstração
const irDemo = () => window.location.assign("/apresentar?slide=3");

const SLIDES: { titulo: string; Corpo: () => React.ReactNode; notas: string }[] = [
  {
    titulo: "Abertura",
    Corpo: Abertura,
    notas: "A loja sabe o que vende. E o porquê? Nas visitas ao shopping, lojistas menores contaram que têm dificuldade de organizar dados e acompanhamento.",
  },
  {
    titulo: "O problema",
    Corpo: ProblemaSecao,
    notas: "O cliente pediu, não tinha. No dia corrido essa informação se perde. Exemplo fictício: não diga que é receita perdida.",
  },
  {
    titulo: "Demonstração",
    Corpo: Demonstracao,
    notas: "Clique em Ouvir apresentação. A funcionária fala, o assistente confere e só grava depois da confirmação. Ligue o Modo guiado se for falar por cima. Diga: dados fictícios, voz sintética.",
  },
  {
    titulo: "Como funciona",
    Corpo: () => <FilmeProduto onExplorar={irDemo} />,
    notas: "A prévia começa sozinha; use pausa, barra e velocidade. Primeiro só o sistema da loja: a procura some. Depois com a nossa camada ao lado: o agente de IA preenche o registro, vêm os números da semana, o contato com clientes que autorizaram e o próximo passo. É uma prévia sem áudio; o vídeo final está em produção. A entrada é por planilha: não diga que está integrado ao caixa.",
  },
  {
    titulo: "Como ajuda",
    Corpo: () => <GradeBeneficios onVerDemo={irDemo} />,
    notas: "Cada card tem um exemplo: fala, ranking, sugestão com motivo, conferência e contexto. Seis procuras não são seis pessoas nem seis vendas.",
  },
  {
    titulo: "Na rotina",
    Corpo: () => <RotinaLoja onVerDemo={irDemo} />,
    notas: "Troque os três momentos: no balcão, depois do expediente, na próxima decisão. A loja continua nas mãos da equipe.",
  },
  {
    titulo: "A semana",
    Corpo: SemanaNaLoja,
    notas: "Como entra na rotina: importar, registrar, decidir, chamar e medir. Entrada por planilha hoje; conexão direta em estudo.",
  },
  {
    titulo: "Próximo passo",
    Corpo: Fechamento,
    notas: "Próximo passo concreto: piloto acompanhado numa loja, medindo procura sem estoque e conversão. Não prometa porcentagem.",
  },
];

/** Ajusta o slide à altura disponível (escala) sem cortar conteúdo. */
function Encaixe({ children }: { children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const [alto, setAlto] = useState(0);
  useLayoutEffect(() => {
    const c = caixa.current,
      el = conteudo.current;
    if (!c || !el) return;
    const medir = () => {
      const h = el.offsetHeight; // transform não altera offsetHeight: é a altura natural
      setAlto(h);
      setEscala(h ? Math.min(1, Math.max(0.5, ((c.clientHeight - 8) / h) * 0.98)) : 1);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(c);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={caixa} className="flex h-full items-center justify-center overflow-hidden">
      <div style={{ height: alto ? alto * escala : undefined }} className="w-full">
        <div ref={conteudo} className="w-full origin-top" style={{ transform: escala < 1 ? `scale(${escala})` : undefined }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PitchPage() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const menos = useMenosMovimento();
  const total = SLIDES.length;
  const inicial = Math.min(total - 1, Math.max(0, Number(params.get("slide") ?? 1) - 1));
  const [i, setI] = useState(inicial);
  const [direcao, setDirecao] = useState(1);
  const [notas, setNotas] = useState(false);

  const ir = useCallback(
    (n: number) => {
      const alvo = Math.min(total - 1, Math.max(0, n));
      setDirecao(alvo >= i ? 1 : -1);
      setI(alvo);
      setParams({ slide: String(alvo + 1) }, { replace: true }); // link direto para o slide
    },
    [i, total, setParams],
  );

  const telaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (["ArrowRight", "PageDown"].includes(e.key) || (e.key === " " && !(t instanceof HTMLButtonElement))) {
        e.preventDefault();
        ir(i + 1);
      } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        ir(i - 1);
      } else if (e.key === "Home") ir(0);
      else if (e.key === "End") ir(total - 1);
      else if (e.key.toLowerCase() === "f") telaCheia();
      else if (e.key.toLowerCase() === "n") setNotas((v) => !v);
      else if (e.key === "Escape" && !document.fullscreenElement) nav("/");
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [i, ir, nav, total]);

  const slide = SLIDES[i]!;
  const Corpo = slide.Corpo;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* barra fina do apresentador */}
      <header className="flex h-12 shrink-0 items-center gap-3 px-4">
        <Link to="/" aria-label="Sair da apresentação" className="flex items-center">
          <LogoAnimado compacto classeNome="max-sm:hidden" />
        </Link>
        <p className="ml-2 truncate text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{slide.titulo}</span> · {i + 1}/{total}
        </p>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setNotas((v) => !v)} aria-pressed={notas} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Notas do apresentador (N)">
            <NotebookPen className="size-4" />
          </button>
          <button type="button" onClick={telaCheia} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Tela cheia (F)">
            <Expand className="size-4" />
          </button>
          <Link to="/" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sair (Esc)">
            <X className="size-4" />
          </Link>
        </div>
      </header>

      <main className="relative min-h-0 flex-1" aria-roledescription="apresentação" aria-label={`Slide ${i + 1} de ${total}: ${slide.titulo}`}>
        <AnimatePresence mode="wait" custom={direcao} initial={false}>
          <motion.div
            key={i}
            custom={direcao}
            initial={menos ? { opacity: 0 } : { opacity: 0, x: direcao * 48, scale: 0.985 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={menos ? { opacity: 0 } : { opacity: 0, x: direcao * -48, scale: 0.985 }}
            transition={{ duration: menos ? 0.15 : 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 pb-3"
          >
            <Encaixe>
              <Corpo />
            </Encaixe>
          </motion.div>
        </AnimatePresence>

        <button type="button" onClick={() => ir(i - 1)} disabled={i === 0} aria-label="Slide anterior" className="absolute left-2 top-1/2 z-conteudo hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/80 text-foreground shadow backdrop-blur transition-opacity hover:bg-card disabled:opacity-0 md:grid">
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" onClick={() => ir(i + 1)} disabled={i === total - 1} aria-label="Próximo slide" className="absolute right-2 top-1/2 z-conteudo hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card/80 text-foreground shadow backdrop-blur transition-opacity hover:bg-card disabled:opacity-0 md:grid">
          <ChevronRight className="size-5" />
        </button>
      </main>

      {notas && (
        <aside className="shrink-0 border-t border-border bg-card px-5 py-3 text-base leading-7" aria-label="Notas do apresentador">
          <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-neon-700 dark:text-neon-500">Notas</span>
          {slide.notas}
        </aside>
      )}

      {/* progresso: cada segmento leva ao slide */}
      <nav aria-label="Slides" className="flex h-8 shrink-0 items-center gap-1 px-4 pb-2">
        {SLIDES.map((s, k) => (
          <button
            key={s.titulo}
            type="button"
            onClick={() => ir(k)}
            aria-current={k === i ? "step" : undefined}
            aria-label={`${k + 1}. ${s.titulo}`}
            title={s.titulo}
            className="group flex h-full flex-1 items-center"
          >
            <span className={cn("h-1 w-full rounded-full transition-colors duration-300", k <= i ? "bg-violeta-500" : "bg-muted group-hover:bg-tinta-300")} />
          </button>
        ))}
      </nav>
    </div>
  );
}
