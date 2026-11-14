// Página inicial em painéis empilhados (ref. visual: Dribbble "Maritime Fusion Reactor", Flexy LLC),
// adaptada à marca: noite tinta → violeta → luz, e o coral como brilho do "sinal" que acabou de chegar.
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
 * do painel, com o brilho coral atrás. Sobe por baixo da nav flutuante (-mt).
 */
export function Hero({ onComecar, children }: { onComecar: () => void; children?: React.ReactNode }) {
  return (
    <section className="-mt-[68px] px-3 pt-3" data-capitulo="noite">
      <div className="painel-noite relative isolate mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-white/10 text-white">
        <FundoEstilhacos sempreEscuro className="absolute inset-x-0 top-0 -z-10 h-[560px] opacity-70" />
        <div className="px-3 pb-5 pt-28 sm:px-8 lg:px-12 lg:pt-32">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-sm font-medium text-tinta-300">Inteligência comercial para lojas de moda e acessórios</p>
            <h1 className="titulo-fino mt-4 font-display text-[clamp(2.2rem,5.4vw,4.25rem)] font-bold leading-[1.02] text-white">
              <TituloSubindo texto="Sua equipe fala." />
              <br />
              <span className="text-violeta-300">
                <TituloSubindo texto="A loja ganha o próximo passo." atraso={180} />
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[17px] leading-7 text-tinta-300">
              Veja uma conversa no balcão virar registro, número da loja e uma ação que o vendedor revisa.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onComecar}
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-tinta-950 shadow-[0_8px_30px_-8px_rgb(255_255_255/0.45)] transition-transform hover:-translate-y-0.5"
              >
                <Play className="size-4" aria-hidden /> Assistir à demonstração
              </button>
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
              >
                Entrar na loja <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="relative mt-12">
            <span className="brilho-sinal pointer-events-none absolute left-1/2 top-1/4 -z-10 h-72 w-[min(90%,760px)] -translate-x-1/2" aria-hidden />
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

const TITULO_SECAO = "titulo-fino font-display text-[clamp(1.8rem,3.6vw,2.75rem)] font-bold leading-tight";

/** Bento de diferenciais: cartões altos, cada um com sua atmosfera (noite, estrias, raios). */
export function Diferenciais() {
  return (
    <PainelSecao capitulo="claro">
      <section id="diferenciais" aria-labelledby="dif-titulo" className="scroll-mt-24 px-3 py-14 sm:px-8 lg:px-12">
        <h2 id="dif-titulo" className={cn(TITULO_SECAO, "text-center")}>
          Por que o MídiaComercial?
        </h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Entrada className="lg:row-span-2">
            <article className="painel-noite flex h-full min-h-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 p-6 text-white">
              <h3 className="text-lg font-semibold">A conversa vira registro</h3>
              <p className="mt-1 text-[15px] leading-6 text-tinta-300">
                O funcionário fala no balcão. O assistente entende, mostra os campos e só grava depois da confirmação.
              </p>
              <div className="mt-auto flex flex-col gap-2 pt-8 text-sm" aria-hidden>
                <span className="self-end rounded-2xl rounded-tr-sm bg-violeta-500 px-3 py-2">Procuraram calça 42 e não tinha.</span>
                <span className="self-start rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3 py-2">Calça jeans azul, 42, sem estoque. Confere?</span>
                <span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-sinal-ok/15 px-2.5 py-1 text-xs font-semibold text-sinal-ok">
                  <BadgeCheck className="size-3.5" /> Registrado depois de confirmar
                </span>
              </div>
            </article>
          </Entrada>
          <Entrada atraso={80}>
            <article className="painel-estrias flex h-full min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl border border-white/10 p-6 text-center text-white">
              <p className="titulo-fino font-display text-6xl font-bold">4 toques</p>
              <p className="mt-2 text-sm text-tinta-100/80">para registrar uma procura no balcão, ou uma frase falada</p>
            </article>
          </Entrada>
          <Entrada atraso={160} className="lg:row-span-2">
            <article className="painel-raios flex h-full min-h-[400px] items-center justify-center overflow-hidden rounded-2xl p-6 text-center">
              <p className="titulo-fino font-display text-[clamp(1.9rem,3vw,2.6rem)] font-bold leading-[1.05] text-[#fff1d6] [text-shadow:0_2px_24px_rgb(0_0_0/0.45)]">
                Nenhuma mensagem
                <br />
                sai sem revisão
              </p>
            </article>
          </Entrada>
          <Entrada atraso={240}>
            <article className="flex h-full min-h-[200px] flex-col rounded-2xl border border-border bg-card p-6">
              <p className="titulo-fino font-display text-5xl font-bold text-violeta-600 dark:text-violeta-300">3</p>
              <h3 className="mt-2 font-semibold">decisões por semana, no máximo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Cada uma com evidência, limitação e próximo passo. Nada de painel cheio de números soltos.</p>
            </article>
          </Entrada>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Entrada>
            <article className="flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-6">
              <ShieldCheck className="mt-0.5 size-6 shrink-0 text-violeta-500" aria-hidden />
              <div>
                <h3 className="font-semibold">Os dados ficam com a sua loja</h3>
                <p className="mt-1 text-sm text-muted-foreground">Cada loja vê só os próprios dados. Contato com cliente só com autorização (LGPD).</p>
              </div>
            </article>
          </Entrada>
          <Entrada atraso={80}>
            <article className="flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-6">
              <LayoutDashboard className="mt-0.5 size-6 shrink-0 text-coral-500" aria-hidden />
              <div>
                <h3 className="font-semibold">Entra por arquivo, hoje</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Vendas, estoque e clientes pela planilha do seu sistema. Conexão direta com o sistema da loja está em estudo com lojas piloto.
                </p>
              </div>
            </article>
          </Entrada>
        </div>
      </section>
    </PainelSecao>
  );
}

/** "Escolha seu caminho": lista com divisórias finas e chevrons, com o orbe coral do sinal. */
export function Caminhos({ onComecar }: { onComecar: () => void }) {
  const linha = "flex h-16 w-full items-center justify-between gap-3 border-b border-white/10 text-left text-lg text-white transition-colors hover:text-violeta-300";
  const seta = <ChevronRight className="size-5 shrink-0 text-tinta-300" aria-hidden />;
  return (
    <PainelSecao escuro capitulo="noite">
      <section aria-labelledby="caminhos-titulo" className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <span className="relative mx-auto block size-16" aria-hidden>
            <span className="brilho-sinal absolute -inset-6" />
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffd2b8,var(--color-coral-500)_45%,#7a1f06_100%)] shadow-[0_0_40px_var(--color-coral-500)]" />
          </span>
          <h2 id="caminhos-titulo" className={cn(TITULO_SECAO, "mt-6 text-white")}>
            Escolha seu caminho
          </h2>
          <p className="mt-2 text-tinta-300">Veja funcionando, entre na sua loja ou conheça quem fez.</p>
        </div>
        <ul className="mx-auto mt-10 max-w-xl border-t border-white/10">
          <li>
            <button type="button" onClick={onComecar} className={linha}>
              Assistir à demonstração {seta}
            </button>
          </li>
          <li>
            <Link to="/login" className={linha}>
              Sou lojista: entrar na minha loja {seta}
            </Link>
          </li>
          <li>
            <a href="#como-funciona" className={linha}>
              Ver como funciona, passo a passo {seta}
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
