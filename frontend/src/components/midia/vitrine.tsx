// Página inicial em painéis empilhados (ref. visual: Dribbble "Maritime Fusion Reactor", Flexy LLC),
// adaptada à marca: noite tinta → violeta → luz, e o verde neon da marca como brilho; o coral fica só para a procura sem estoque.
import { ArrowRight, BadgeCheck, ChevronDown, ChevronRight, LayoutDashboard, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Entrada, FundoEstilhacos, PilhaAlternada, TituloSubindo } from "./destaques";

/** Seção como painel arredondado empilhado. `escuro`: sempre escuro, nos dois temas. */
export function PainelSecao({
  children,
  className,
  escuro = false,
  capitulo = "claro",
}: {
  children: React.ReactNode;
  className?: string;
  escuro?: boolean;
  /** cor que a nav assume quando esta seção está embaixo dela */
  capitulo?: "noite" | "coral" | "violeta" | "claro";
}) {
  return (
    <div className="px-3 pt-3" data-capitulo={capitulo}>
      <div
        className={cn(
          "relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border",
          escuro ? "painel-noite border-white/10 text-white" : "painel-secao border-border",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Primeira dobra (ref.: ReactBits CardSwap e "scroll-expand", heros em duas colunas do Dribbble): título
 * alinhado à esquerda e painel animado à direita, os dois até perto das bordas. Abaixo, o palco da
 * demonstração começa recuado e se expande até a largura toda conforme a pessoa rola (GSAP, MovimentoLanding).
 * Sobe por baixo da nav flutuante (-mt).
 */
export function Hero({ onComecar, children }: { onComecar: () => void; children?: React.ReactNode }) {
  return (
    <section className="-mt-[68px] px-3 pt-3" data-capitulo="noite">
      <div className="painel-noite relative isolate mx-auto w-full max-w-[1680px] overflow-hidden rounded-[28px] border border-white/10 text-white">
        <div data-gsap="fundo" className="absolute inset-x-0 top-0 -z-10 h-[760px]">
          <FundoEstilhacos sempreEscuro className="absolute inset-0 opacity-70" />
        </div>
        <span className="brilho-marca pointer-events-none absolute -right-24 top-24 -z-10 h-[28rem] w-[28rem] opacity-60 max-lg:hidden" aria-hidden />
        <div className="px-4 pb-5 pt-24 sm:px-8 sm:pt-28 lg:px-14 lg:pt-32 2xl:px-20">
          <div className="grid items-center gap-10 lg:min-h-[min(640px,calc(100svh-10rem))] lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-8 xl:gap-16">
          <div data-gsap="recua" className="min-w-0 text-center lg:text-left">
            <h1 className="titulo-hero text-[clamp(2.3rem,7.4vw,6.4rem)] leading-[0.96] text-white lg:text-[clamp(3rem,5.4vw,6.2rem)]">
              <TituloSubindo texto="Sua loja sabe o que vende?" />
              <br />
              <span className="text-neon-500">
                <TituloSubindo texto="E o porquê?" atraso={220} />
              </span>
            </h1>
            <p data-gsap="sobe" className="mx-auto mt-6 max-w-xl text-lg leading-7 text-tinta-200 lg:mx-0">
              A conversa do balcão vira registro e próxima ação.
            </p>
            <div data-gsap="sobe" className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
              <button
                type="button"
                onClick={onComecar}
                className="inline-flex h-13 items-center gap-2 rounded-xl bg-neon-500 px-7 text-base font-bold text-tinta-950 shadow-[0_10px_40px_-8px_rgb(182_255_59/0.6)] transition-transform hover:-translate-y-0.5 hover:bg-neon-300"
              >
                <Play className="size-4" aria-hidden /> Ver demonstração
              </button>
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
              >
                Entrar <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul data-gsap="sobe" className="mt-9 grid max-w-xl grid-cols-3 gap-2 text-left max-lg:mx-auto sm:gap-3">
              {PASSOS_HERO.map((p) => (
                <li key={p.titulo} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2.5 backdrop-blur-sm sm:px-3">
                  <p className="text-sm font-semibold text-white">{p.titulo}</p>
                  <p className="mt-0.5 text-xs leading-4 text-tinta-300">{p.texto}</p>
                </li>
              ))}
            </ul>
          </div>

          <div data-gsap="sobe" className="min-w-0">
            <div data-gsap="painel">
              <PainelHero />
            </div>
          </div>
          </div>

          <div data-gsap="palco" className="relative mt-14 lg:mt-10">
            <span className="brilho-marca pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-[min(90%,760px)] -translate-x-1/2" aria-hidden />
            {/* scroll-expand: o palco começa recuado e cresce até a largura toda (com movimento, md+) */}
            <div data-gsap="expande" className="origin-top">
              {children}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between px-1 text-xs text-tinta-100/80">
            <span>Feito no Hackrun · Equipe NidoQueen</span>
            <a href="#diferenciais" className="hidden items-center gap-1 hover:text-white sm:inline-flex">
              Role para ver mais <ChevronDown className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

const PASSOS_HERO = [
  { titulo: "Ouvir", texto: "Fala ou toque no balcão" },
  { titulo: "Conferir", texto: "Nada grava sem o seu ok" },
  { titulo: "Decidir", texto: "Sinal e próxima ação" },
];

const ONDA = [5, 9, 14, 8, 16, 11, 6, 13, 17, 9, 12, 7, 15, 10, 6, 12, 8, 14, 9, 5];
const BARRAS = [1, 0, 1, 0, 2, 1, 1];
const ETAPAS_PAINEL = ["Ouvir", "Registrar", "Decidir"];

/** Cartão de vidro escuro do painel do hero. */
function CartaoHero({ etapa, titulo, children }: { etapa: string; titulo: string; children: React.ReactNode }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/15 bg-[#0d1124] p-4 shadow-[0_30px_70px_-30px_rgb(0_0_0/0.9)] sm:p-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violeta-300">{etapa}</span>
      <p className="mt-1.5 font-display text-lg font-bold leading-tight text-white">{titulo}</p>
      <div className="mt-3 flex min-h-0 flex-1 flex-col">{children}</div>
    </article>
  );
}

/** Painel animado da primeira dobra: pilha de cards (ReactBits CardSwap) com as três etapas. */
export function PainelHero() {
  const [frente, setFrente] = useState(0);
  return (
    <div
      className="relative mx-auto h-[350px] w-full max-w-[580px] sm:h-[400px] lg:mr-0 lg:h-[440px]"
      role="img"
      aria-label="Exemplo: a fala do balcão vira registro conferido e um sinal com a próxima ação"
    >
      <PilhaAlternada
        intervalo={3800}
        deslocX={24}
        deslocY={24}
        onTroca={setFrente}
        className="absolute bottom-9 left-0 h-[262px] w-[calc(100%-52px)] sm:h-[300px] sm:w-[calc(100%-64px)] lg:h-[320px]"
      >
        <CartaoHero etapa="1 · Ouvir" titulo="O vendedor fala, o assistente escuta">
          <div className="ml-auto w-[min(100%,20rem)] rounded-2xl rounded-tr-sm bg-violeta-500 px-3.5 py-3">
            <div className="hero-onda flex h-5 items-center gap-[3px] overflow-hidden" aria-hidden>
              {ONDA.map((h, i) => (
                <span key={i} className="w-[3px] shrink-0 rounded-full bg-white/85" style={{ height: h, animationDelay: `${(i % 7) * 0.11}s` }} />
              ))}
            </div>
            <p className="mt-2 text-sm leading-5 text-white">“Procuraram calça jeans azul 42 e não tinha.”</p>
          </div>
          <p className="mt-auto flex items-center gap-2 text-xs text-tinta-300">
            <span className="size-1.5 animate-pulse rounded-full bg-neon-500" aria-hidden /> transcrevendo a fala…
          </p>
        </CartaoHero>
        <CartaoHero etapa="2 · Registrar" titulo="Os dados aparecem para conferir">
          <dl className="grid grid-cols-2 gap-1.5 text-sm">
            {[
              ["Produto", "Calça jeans"],
              ["Cor", "Azul"],
              ["Tamanho", "42"],
              ["Motivo", "Sem estoque"],
            ].map(([r, v]) => (
              <div key={r} className="min-w-0 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
                <dt className="text-[11px] text-tinta-300">{r}</dt>
                <dd className="truncate font-semibold text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <span className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg bg-neon-500 px-3 py-1.5 text-xs font-bold text-tinta-950">
            <BadgeCheck className="size-3.5" aria-hidden /> Confirmar registro
          </span>
        </CartaoHero>
        <CartaoHero etapa="3 · Decidir" titulo="O sinal vira próxima ação">
          <div className="flex items-end justify-between gap-3">
            <p className="font-display text-4xl font-extrabold leading-none text-white">
              6<span className="ml-1.5 text-xs font-medium text-tinta-300">procuras · 7 dias</span>
            </p>
            <ul className="flex h-12 shrink-0 items-end gap-1" aria-hidden>
              {BARRAS.map((v, i) => (
                <li key={i} className={cn("w-2.5 rounded-t", i === BARRAS.length - 1 ? "bg-neon-500" : "bg-violeta-300")} style={{ height: `${20 + v * 38}%` }} />
              ))}
            </ul>
          </div>
          <p className="mt-3 rounded-lg bg-white/[0.06] px-2.5 py-2 text-xs text-tinta-200">Saldo informado 0 · planilha da loja</p>
          <p className="mt-auto text-sm text-white">
            Conferir o estoque e consultar o fornecedor. <span className="text-neon-500">Você decide.</span>
          </p>
        </CartaoHero>
      </PilhaAlternada>

      <span className="efeito-flutua absolute right-0 top-1 inline-flex items-center gap-1.5 rounded-full border border-neon-500/40 bg-tinta-950/85 px-3 py-1.5 text-xs font-semibold text-neon-500 backdrop-blur max-sm:hidden">
        <ShieldCheck className="size-3.5" aria-hidden /> Nada grava sem o seu ok
      </span>

      <ol className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 lg:justify-start" aria-hidden>
        {ETAPAS_PAINEL.map((e, i) => (
          <li key={e} className={cn("flex items-center gap-1.5 text-[11px] font-medium transition-colors", i === frente ? "text-white" : "text-tinta-300")}>
            <span className={cn("h-1 rounded-full transition-all duration-500", i === frente ? "w-8 bg-neon-500" : "w-3 bg-white/25")} />
            {e}
          </li>
        ))}
      </ol>
    </div>
  );
}

const TITULO_SECAO = "titulo-secao";

const TOQUES = ["Produto", "Tamanho", "Motivo", "Salvar"];
const ARQUIVO = ["Planilha", "Prévia", "Conferência"];

/** Bento de diferenciais em grade de 6 colunas: 4+2 · 2+2+2 · faixa inteira. Tudo alinhado pela mesma borda. */
export function Diferenciais() {
  const cartao = "flex h-full flex-col overflow-hidden rounded-2xl border p-6 sm:p-7";
  const etiqueta = "text-xs font-semibold uppercase tracking-[0.14em]";
  return (
    <PainelSecao capitulo="claro">
      <section id="diferenciais" aria-labelledby="dif-titulo" className="scroll-mt-24 px-4 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-12">
          <div className="min-w-0">
            <p className={cn(etiqueta, "text-violeta-600 dark:text-violeta-300")}>Diferenciais</p>
            <h2 id="dif-titulo" className={cn(TITULO_SECAO, "mt-2")}>
              Por que o MidiaComercial?
            </h2>
          </div>
          <p className="min-w-0 text-base leading-7 text-muted-foreground">
            Registra rápido, mostra pouco e nada sai sem uma pessoa conferir.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          {/* 1 · conversa vira registro (largo): texto à esquerda, conversa à direita */}
          <Entrada className="md:col-span-2 lg:col-span-4">
            <article className={cn(cartao, "painel-noite border-white/10 text-white")}>
              <div className="grid h-full items-center gap-8 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className={cn(etiqueta, "text-violeta-300")}>Voz ou toque</p>
                  <h3 className="titulo-cartao mt-2">A conversa vira registro</h3>
                  <p className="mt-3 text-[15px] leading-6 text-tinta-300">
                    O vendedor fala. O assistente preenche e só grava depois do ok.
                  </p>
                </div>
                <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm" aria-hidden>
                  <span className="max-w-[92%] self-end rounded-2xl rounded-tr-sm bg-violeta-500 px-3 py-2">Procuraram calça 42 e não tinha.</span>
                  <span className="max-w-[92%] self-start rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3 py-2">
                    Calça jeans azul, 42, sem estoque. Confere?
                  </span>
                  <span className="mt-1 inline-flex items-center gap-1.5 self-start rounded-lg border border-sinal-ok/30 bg-tinta-950/70 px-2.5 py-1 text-xs font-semibold text-sinal-ok">
                    <BadgeCheck className="size-3.5 shrink-0" /> Registrado depois de confirmar
                  </span>
                </div>
              </div>
            </article>
          </Entrada>

          {/* 2 · 4 toques: o número e os quatro passos */}
          <Entrada atraso={80} className="lg:col-span-2">
            <article className={cn(cartao, "painel-estrias min-h-[260px] justify-end border-white/10 text-white")}>
              <p className="titulo-fino font-display text-6xl font-bold leading-none">4 toques</p>
              <p className="mt-3 text-sm leading-6 text-tinta-100/85">ou uma frase, para registrar uma procura</p>
              <ol className="mt-5 grid grid-cols-2 gap-1.5 text-xs" aria-label="Os quatro toques">
                {TOQUES.map((t, i) => (
                  <li key={t} className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/15 bg-tinta-950/50 px-2.5 py-1 font-medium">
                    <span className="tabular font-semibold text-violeta-300">{i + 1}</span> {t}
                  </li>
                ))}
              </ol>
            </article>
          </Entrada>

          {/* 3 · três cartões iguais */}
          <Entrada className="lg:col-span-2">
            <article className={cn(cartao, "min-h-[240px] border-border bg-card")}>
              <p className="titulo-fino font-display text-6xl font-bold leading-none text-violeta-600 dark:text-violeta-300">3</p>
              <h3 className="mt-auto pt-6 text-lg font-semibold">decisões por semana</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Cada uma com o motivo e o próximo passo.
              </p>
            </article>
          </Entrada>
          <Entrada atraso={80} className="lg:col-span-2">
            <article className={cn(cartao, "painel-raios min-h-[240px] items-center justify-center border-transparent text-center")}>
              <p className="titulo-fino font-display text-[clamp(1.75rem,2.6vw,2.3rem)] font-bold leading-[1.08] text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.45)]">
                Nenhuma mensagem
                <br />
                <span className="text-neon-500">sai sem revisão</span>
              </p>
            </article>
          </Entrada>
          <Entrada atraso={160} className="md:col-span-2 lg:col-span-2">
            <article className={cn(cartao, "min-h-[240px] border-border bg-card")}>
              <span className="grid size-12 place-items-center rounded-xl bg-violeta-500/10 text-violeta-600 dark:text-violeta-300" aria-hidden>
                <ShieldCheck className="size-6" />
              </span>
              <h3 className="mt-auto pt-6 text-lg font-semibold">Os dados são da loja</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Cada loja vê só os seus. Contato com cliente só com autorização (LGPD).
              </p>
            </article>
          </Entrada>

          {/* 4 · faixa inteira: como os dados entram hoje, e o que ainda está em estudo */}
          <Entrada className="md:col-span-2 lg:col-span-6">
            <article className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-neon-500/20 text-neon-700 dark:bg-neon-500/10 dark:text-neon-500" aria-hidden>
                  <LayoutDashboard className="size-6" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">Entra por planilha</h3>
                  <p className="mt-1.5 max-w-[60ch] text-sm leading-6 text-muted-foreground">
                    Vendas, estoque e clientes vêm da planilha do seu sistema. A conexão direta ainda está em estudo.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs font-medium lg:justify-end">
                {ARQUIVO.map((p, i) => (
                  <span key={p} className="inline-flex items-center gap-1.5">
                    <span className="rounded-full border border-border bg-background px-2.5 py-1">{p}</span>
                    {i < ARQUIVO.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
                  </span>
                ))}
                <span className="rounded-full border border-dashed border-neon-600 px-2.5 py-1 text-neon-700 dark:border-neon-500/50 dark:text-neon-500">Conexão direta: em estudo</span>
              </div>
            </article>
          </Entrada>
        </div>
      </section>
    </PainelSecao>
  );
}

/** "Escolha seu caminho": lista com divisórias finas e chevrons, com o orbe neon da marca. */
export function Caminhos({ onComecar }: { onComecar: () => void }) {
  const linha = "flex h-16 w-full items-center justify-between gap-3 border-b border-white/10 text-left text-lg text-white transition-colors hover:text-violeta-300";
  const seta = <ChevronRight className="size-5 shrink-0 text-tinta-300" aria-hidden />;
  return (
    <PainelSecao escuro capitulo="noite">
      <section aria-labelledby="caminhos-titulo" className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <span className="relative mx-auto block size-16" aria-hidden>
            <span className="brilho-marca absolute -inset-6" />
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f6ffe0,var(--color-neon-500)_45%,#2f4a00_100%)] shadow-[0_0_40px_rgb(182_255_59/0.55)]" />
          </span>
          <h2 id="caminhos-titulo" className={cn(TITULO_SECAO, "mt-6 text-white")}>
            Escolha seu caminho
          </h2>
          <p className="mt-2 text-tinta-300">Veja funcionando ou entre na sua loja.</p>
        </div>
        <ul className="mx-auto mt-10 max-w-xl border-t border-white/10">
          <li>
            <button type="button" onClick={onComecar} className={linha}>
              Ver a demonstração {seta}
            </button>
          </li>
          <li>
            <Link to="/login" className={linha}>
              Entrar na minha loja {seta}
            </Link>
          </li>
          <li>
            <a href="#filme" className={linha}>
              Como funciona {seta}
            </a>
          </li>
          <li>
            <a href="#sobre" className={linha}>
              Conhecer a equipe {seta}
            </a>
          </li>
        </ul>
      </section>
    </PainelSecao>
  );
}
