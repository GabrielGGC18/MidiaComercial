// Página inicial em painéis empilhados (ref. visual: Dribbble "Maritime Fusion Reactor", Flexy LLC),
// adaptada à marca: noite tinta → violeta → luz, e o verde neon da marca como brilho; o coral fica só para a procura sem estoque.
import { ArrowRight, BadgeCheck, ChevronDown, ChevronRight, LayoutDashboard, Play, ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { Entrada, FundoEstilhacos, TituloSubindo } from "./destaques";

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
 * Primeira dobra: painel "noite → violeta → luz", título curto central e o palco "amanhecendo" no fim
 * do painel, com o brilho neon da marca atrás. Sobe por baixo da nav flutuante (-mt).
 */
export function Hero({ onComecar, children }: { onComecar: () => void; children?: React.ReactNode }) {
  return (
    <section className="-mt-[68px] px-3 pt-3" data-capitulo="noite">
      <div className="painel-noite relative isolate mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/10 text-white">
        <div data-gsap="fundo" className="absolute inset-x-0 top-0 -z-10 h-[560px]">
          <FundoEstilhacos sempreEscuro className="absolute inset-0 opacity-70" />
        </div>
        <div className="px-3 pb-5 pt-28 sm:px-8 lg:px-12 lg:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <p data-gsap="sobe" className="inline-flex items-center gap-2 rounded-full border border-neon-500/40 bg-neon-500/10 px-3.5 py-1.5 text-sm font-semibold text-neon-500">
              <span className="size-1.5 rounded-full bg-neon-500" aria-hidden /> Para lojas de moda e acessórios
            </p>
            <h1 className="titulo-hero mt-5 text-[clamp(2.3rem,6.6vw,5.5rem)] leading-[0.98] text-white">
              <TituloSubindo texto="Sua loja sabe o que vende?" />
              <br />
              <span className="text-neon-500">
                <TituloSubindo texto="E o porquê?" atraso={220} />
              </span>
            </h1>
            <p data-gsap="sobe" className="mx-auto mt-6 max-w-xl text-lg leading-7 text-tinta-200">
              A conversa do balcão vira registro e próxima ação.
            </p>
            <div data-gsap="sobe" className="mt-7 flex flex-wrap justify-center gap-3">
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
          </div>

          <div data-gsap="palco" className="relative mt-12">
            <span className="brilho-marca pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-[min(90%,760px)] -translate-x-1/2" aria-hidden />
            {children}
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
