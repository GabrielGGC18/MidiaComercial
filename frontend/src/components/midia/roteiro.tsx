// Quatro telas da apresentação pública (APRESENTACAO1 v2.0): problema alinhado, roteiro do filme,
// cards com exemplo e ação, e a cena da rotina da loja. Um exemplo só atravessa tudo (fixture fictícia):
// calça jeans azul 42, 5 procuras + 1 = 6 nos últimos 7 dias, saldo informado 0. Nada aqui grava no produto.
import { ArrowRight, BadgeCheck, CalendarDays, Check, FileText, ListChecks, Mic, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { indice, Revelar } from "./destaques";
import { DURACAO_FILME, FilmeAnimado } from "./filme";

const PAINEL = "mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border px-5 py-14 sm:px-10 lg:px-14 lg:py-20";
const ETIQUETA = "text-xs font-semibold uppercase tracking-[0.14em]";
const TITULO = "titulo-secao";
const CARTAO = "flex min-w-0 flex-col gap-3 rounded-[20px] border border-border bg-card p-5 sm:p-6";
const ACAO =
  "mt-auto inline-flex h-11 items-center gap-2 self-start rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:border-violeta-400 hover:text-violeta-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-300 dark:hover:text-violeta-300";
const SELO = "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground";

const RANKING = [
  { nome: "Calça jeans azul 42", n: 6 },
  { nome: "Tênis branco 41", n: 4 },
  { nome: "Camiseta básica M", n: 3 },
];

function Seta() {
  return <ArrowRight className="size-4" aria-hidden />;
}

/* ───────────── Foto 2 · o problema, em um bloco de leitura ───────────── */

export function ProblemaSecao() {
  return (
    <div className="px-3 pt-3" data-capitulo="coral">
      <section aria-labelledby="problema-titulo" className={cn(PAINEL, "relative border-white/10 bg-tinta-950 text-white")}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <Revelar modo="grupo" className="min-w-0 max-w-[38rem]">
            <h2 id="problema-titulo" style={indice(0)} className="font-display text-[clamp(2.25rem,4.8vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.035em]">
              <span className="block">O cliente pediu.</span>
              <span className="block text-coral-500">Não tinha.</span>
            </h2>
            <p style={indice(1)} className="mt-5 max-w-[32ch] text-[clamp(1.25rem,2vw,1.625rem)] font-semibold leading-[1.3]">
              Essa procura merece ser lembrada.
            </p>
            <p style={indice(2)} className="mt-4 max-w-[42ch] text-base leading-[1.55] text-tinta-300">
              No dia corrido, uma informação importante pode se perder. Sua equipe registra o que faltou e a loja volta a esse sinal quando for
              decidir o próximo passo.
            </p>
            <a
              href="#filme"
              style={indice(3)}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-tinta-950 transition-transform hover:-translate-y-0.5"
            >
              Veja como funciona <Seta />
            </a>
          </Revelar>

          {/* visual de apoio: fala → registro, reto e na mesma grade */}
          <Revelar modo="grupo" className="min-w-0">
            <div style={indice(1)} className="rounded-[20px] border border-white/10 bg-[#11182c] p-5 sm:p-6">
              <p className="text-xs font-medium text-tinta-300">Funcionária · no balcão</p>
              <p className="mt-2 max-w-[30ch] rounded-2xl rounded-tl-sm bg-violeta-600 px-4 py-3 text-base leading-6">
                Perguntaram de novo pela calça azul 42.
              </p>
              <span className="ml-6 block h-6 w-px bg-white/20" aria-hidden />
              <div className="rounded-2xl border border-white/10 bg-[#141c34] p-4">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#70e1b2]">
                  <BadgeCheck className="size-4" aria-hidden /> Procura registrada
                </p>
                <p className="mt-2 text-lg font-semibold">Calça jeans · Azul · 42</p>
                <p className="mt-1 text-sm text-tinta-300">Item indisponível no momento do atendimento</p>
              </div>
              <p className="mt-4 text-xs text-tinta-300">Exemplo fictício · situação demonstrativa</p>
            </div>
          </Revelar>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Foto 4 · o filme (ainda sem vídeo: prévia animada em filme.tsx) ───────────── */

export function FilmeProduto({ onExplorar }: { onExplorar: () => void }) {
  // ?filme=18 abre a prévia parada naquele segundo (ensaio e conferência visual)
  const [inicial] = useState(() => {
    const v = Number(new URLSearchParams(window.location.search).get("filme"));
    return Number.isFinite(v) && v > 0 ? Math.min(v, DURACAO_FILME) : 0;
  });
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section id="filme" aria-labelledby="filme-titulo" className={cn(PAINEL, "painel-secao scroll-mt-24 border-border")}>
        <div className="max-w-2xl">
          <p className={cn(ETIQUETA, "text-violeta-600 dark:text-violeta-300")}>Como funciona</p>
          <h2 id="filme-titulo" className={cn(TITULO, "mt-2")}>
            Veja a conversa virar o próximo passo.
          </h2>
          <p className="mt-3 text-lg leading-7 text-muted-foreground">Uma procura no balcão. Um registro conferido. Uma ação para a loja acompanhar.</p>
        </div>
        <div className="mt-10">
          <FilmeAnimado inicial={inicial} />
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={onExplorar} className="inline-flex h-12 items-center gap-2 rounded-xl bg-violeta-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-violeta-700">
            Explorar o fluxo completo <Seta />
          </button>
          <span className={SELO}>Prévia animada (animatic), sem áudio · o vídeo final está em produção</span>
          <span className={SELO}>Demonstração ilustrativa · dados fictícios</span>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Foto 1 · cinco cards: uma ideia, um exemplo, uma ação ───────────── */

function CartaoConferencia({ onVerDemo }: { onVerDemo: () => void }) {
  const [tamanho, setTamanho] = useState("42");
  const [editando, setEditando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const mini = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:border-violeta-400";
  return (
    <article className={cn(CARTAO, "md:col-span-1 lg:col-span-6")}>
      <h3 className="text-xl font-semibold">Confira antes de registrar</h3>
      <p className="text-[15px] leading-6 text-muted-foreground">Você pode ajustar o que foi entendido e confirmar quando estiver certo.</p>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3">
        <label htmlFor="conf-tamanho" className="text-sm text-muted-foreground">
          Tamanho:
        </label>
        {editando ? (
          <select
            id="conf-tamanho"
            value={tamanho}
            autoFocus
            onChange={(e) => {
              setTamanho(e.target.value);
              setEditando(false);
              setConfirmado(false);
            }}
            className="h-9 rounded-lg border border-border bg-card px-2 text-sm font-semibold"
          >
            {["40", "42", "44"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        ) : (
          <span id="conf-tamanho" className="tabular text-base font-semibold">
            {tamanho}
          </span>
        )}
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={mini} onClick={() => setEditando(true)}>
            <Pencil className="size-3.5" aria-hidden /> Corrigir
          </button>
          <button type="button" className={cn(mini, confirmado && "border-sinal-ok text-sinal-ok-tx dark:text-sinal-ok")} onClick={() => setConfirmado(true)}>
            <Check className="size-3.5" aria-hidden /> Confirmar
          </button>
        </span>
        <p className="w-full text-xs text-muted-foreground" aria-live="polite">
          {confirmado ? "Confirmado na demonstração. Nada foi gravado." : "Aguardando conferência · exemplo local"}
        </p>
      </div>
      <button type="button" className={ACAO} onClick={onVerDemo}>
        Experimentar a conferência <Seta />
      </button>
    </article>
  );
}

export function GradeBeneficios({ onVerDemo }: { onVerDemo: () => void }) {
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section id="diferenciais" aria-labelledby="dif-titulo" className={cn(PAINEL, "painel-secao scroll-mt-24 border-border")}>
        <div className="max-w-2xl">
          <p className={cn(ETIQUETA, "text-violeta-600 dark:text-violeta-300")}>Como ajuda</p>
          <h2 id="dif-titulo" className={cn(TITULO, "mt-2")}>
            Da conversa ao próximo passo.
          </h2>
          <p className="mt-3 text-lg leading-7 text-muted-foreground">Veja o que sua equipe pode registrar, conferir e acompanhar na rotina da loja.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {/* A · conversa (principal) */}
          <article className={cn(CARTAO, "md:col-span-2 lg:col-span-7 lg:row-span-2")}>
            <h3 className="text-[22px] font-semibold leading-tight">Fale do seu jeito</h3>
            <p className="text-[15px] leading-6 text-muted-foreground">Uma frase do balcão pode virar um registro que a equipe consegue conferir.</p>
            <div className="my-2 flex flex-1 flex-col justify-center gap-3 rounded-2xl bg-[radial-gradient(120%_90%_at_80%_0%,rgb(109_74_255/0.16),transparent_60%)] p-2 text-base leading-7 sm:p-4 lg:text-lg">
              <p className="max-w-[88%] self-end rounded-2xl rounded-tr-sm bg-violeta-600 px-4 py-2.5 text-white">
                <Mic className="mr-1.5 inline size-4 align-[-2px]" aria-hidden />
                “Procuraram calça jeans azul, tamanho 42, e não tinha.”
              </p>
              <p className="max-w-[88%] self-start rounded-2xl rounded-tl-sm border border-border bg-background px-4 py-2.5">“Calça jeans azul, 42. Item indisponível. Confere?”</p>
              <p className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                <span className="rounded-lg border border-border bg-background px-2.5 py-1 font-semibold">Calça jeans · Azul · 42</span>
                <span className="text-muted-foreground">Aguardando conferência</span>
              </p>
            </div>
            <button type="button" className={ACAO} onClick={onVerDemo}>
              Ver essa conversa <Seta />
            </button>
          </article>

          {/* B · o que ficou faltando */}
          <article className={cn(CARTAO, "lg:col-span-5")}>
            <h3 className="text-xl font-semibold">Veja o que ficou faltando</h3>
            <p className="text-[15px] leading-6 text-muted-foreground">As procuras registradas aparecem juntas, com produto e variação.</p>
            <ol className="flex flex-col gap-1.5 text-sm">
              {RANKING.map((r, i) => (
                <li key={r.nome} className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-2", i === 0 ? "bg-violeta-500/10 font-semibold" : "bg-muted/60")}>
                  <span className="flex min-w-0 items-center gap-2">
                    {i === 0 && <span className="size-1.5 shrink-0 rounded-full bg-coral-500" aria-hidden />}
                    <span className="truncate">{r.nome}</span>
                  </span>
                  <span className="tabular font-semibold">{r.n}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">Exemplo fictício · últimos 7 dias</p>
            <button type="button" className={ACAO} onClick={onVerDemo}>
              Ver as procuras <Seta />
            </button>
          </article>

          {/* C · o próximo passo */}
          <article className={cn(CARTAO, "lg:col-span-5")}>
            <h3 className="text-xl font-semibold">Escolha o próximo passo</h3>
            <p className="text-[15px] leading-6 text-muted-foreground">Entenda por que uma sugestão apareceu e escolha o que fazer.</p>
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
              <li className="px-3 py-2">6 procuras registradas</li>
              <li className="px-3 py-2">Saldo informado: 0</li>
              <li className="flex items-start gap-2 px-3 py-2 font-semibold">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral-500" aria-hidden /> Sugestão: conferir o estoque e consultar o fornecedor
              </li>
            </ul>
            <button type="button" className={ACAO} onClick={onVerDemo}>
              Entender a sugestão <Seta />
            </button>
          </article>

          {/* D · conferência editável (estado local) */}
          <CartaoConferencia onVerDemo={onVerDemo} />

          {/* E · contexto */}
          <article className={cn(CARTAO, "md:col-span-1 lg:col-span-6")}>
            <h3 className="text-xl font-semibold">Acompanhe com contexto</h3>
            <p className="text-[15px] leading-6 text-muted-foreground">Veja o período e a origem dos dados antes de escolher uma ação.</p>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2.5">
                <CalendarDays className="size-4 shrink-0 text-violeta-500" aria-hidden /> Últimos 7 dias
              </li>
              <li className="flex items-center gap-2.5">
                <FileText className="size-4 shrink-0 text-violeta-500" aria-hidden /> Estoque informado às 09h
              </li>
              <li className="flex items-center gap-2.5">
                <ListChecks className="size-4 shrink-0 text-violeta-500" aria-hidden /> Ação: conferir disponibilidade
              </li>
            </ul>
            <button type="button" className={ACAO} onClick={onVerDemo}>
              Ver um plano de ação <Seta />
            </button>
          </article>
        </div>
      </section>
    </div>
  );
}

/* ───────────── Foto 3 · a rotina da loja, em três momentos ───────────── */

const MOMENTOS = [
  { rotulo: "No balcão", sobre: "Funcionária da demonstração", texto: "“Hoje perguntaram de novo pela calça azul 42.”", apoio: "A fala vira uma proposta de registro para conferir." },
  { rotulo: "Depois do expediente", sobre: "Resumo da semana", texto: "6 procuras registradas nesta semana.", apoio: "Calça jeans azul 42 · últimos 7 dias · saldo informado 0." },
  { rotulo: "Na próxima decisão", sobre: "Ação aberta", texto: "Conferir o estoque e consultar o fornecedor.", apoio: "Responsável: gerente · prazo: 7 dias (ilustrativos)." },
];

export function RotinaLoja({ onVerDemo }: { onVerDemo: () => void }) {
  const [sel, setSel] = useState(1);
  const m = MOMENTOS[sel];
  return (
    <div className="px-3 pt-3" data-capitulo="violeta">
      <section id="rotina" aria-labelledby="rotina-titulo" className={cn(PAINEL, "scroll-mt-24 border-white/10 bg-[#0b1020] bg-[radial-gradient(80%_70%_at_85%_10%,rgb(139_92_246/0.22),transparent_65%)] text-white")}>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-5">
            <p className={cn(ETIQUETA, "text-violeta-300")}>Na rotina</p>
            <h2 id="rotina-titulo" className={cn(TITULO, "mt-2")}>
              No fim do dia,
              <br />
              um próximo passo mais claro.
            </h2>
            <p className="mt-4 max-w-[44ch] text-base leading-7 text-tinta-300">
              Sua equipe passa o dia ouvindo clientes. O que foi registrado pode virar uma conversa mais clara sobre o que conferir amanhã.
            </p>
            <p className="mt-4 text-lg font-semibold">A loja continua nas suas mãos.</p>
            <button type="button" onClick={onVerDemo} className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-tinta-950 transition-transform hover:-translate-y-0.5">
              Ver o próximo passo deste exemplo <Seta />
            </button>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div role="group" aria-label="Momentos do dia" className="grid gap-2 sm:grid-cols-3">
              {MOMENTOS.map((x, i) => (
                <button
                  key={x.rotulo}
                  type="button"
                  aria-pressed={i === sel}
                  onClick={() => setSel(i)}
                  className={cn(
                    "min-h-12 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violeta-300",
                    i === sel ? "border-violeta-300 bg-violeta-600 text-white" : "border-white/15 bg-white/5 text-tinta-200 hover:bg-white/10",
                  )}
                >
                  <span className="tabular mr-2 opacity-70">{i + 1}</span>
                  {x.rotulo}
                </button>
              ))}
            </div>
            <div aria-live="polite" className="mt-3 flex min-h-[240px] flex-col rounded-[24px] border border-white/10 bg-[#141c34] p-6 sm:p-8">
              <p className="text-sm font-medium text-violeta-300">{m.sobre}</p>
              <p className="mt-3 font-display text-[clamp(1.5rem,2.6vw,2.25rem)] font-bold leading-[1.15] tracking-tight">{m.texto}</p>
              <p className="mt-3 text-base leading-7 text-tinta-300">{m.apoio}</p>
              <p className="mt-auto pt-6">
                <span className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-tinta-300">Situação demonstrativa · dados fictícios</span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
