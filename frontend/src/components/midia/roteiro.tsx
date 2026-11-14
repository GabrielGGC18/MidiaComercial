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

/* ───────────── Foto 1 · cinco passos ligados por uma linha (diagrama simples) ───────────── */

function Passo({ n, titulo, texto, ultimo = false, children }: { n: number; titulo: string; texto: string; ultimo?: boolean; children: React.ReactNode }) {
  return (
    <li style={indice(n - 1)} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-5">
      {/* trilho: número e a linha que leva ao próximo passo */}
      <div className="flex flex-col items-center" aria-hidden>
        <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-violeta-500 bg-background font-display text-base font-bold text-violeta-600 sm:size-12 sm:text-lg dark:text-violeta-300">
          {n}
        </span>
        {!ultimo && <span className="my-1 w-0.5 flex-1 rounded-full bg-gradient-to-b from-violeta-500 to-violeta-500/15" />}
      </div>
      <article className={cn("grid min-w-0 items-center gap-4 rounded-[20px] border border-border bg-card p-5 sm:p-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-8", !ultimo && "mb-4")}>
        <div className="min-w-0">
          <h3 className="text-xl font-semibold leading-tight">
            <span className="sr-only">Passo {n}: </span>
            {titulo}
          </h3>
          <p className="mt-1.5 text-[15px] leading-6 text-muted-foreground">{texto}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </article>
    </li>
  );
}

function ExemploConferencia() {
  const [tamanho, setTamanho] = useState("42");
  const [editando, setEditando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const mini = "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:border-violeta-400";
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background p-3">
      <span className="rounded-lg bg-muted/60 px-2.5 py-1 text-sm font-semibold">Calça jeans</span>
      <span className="rounded-lg bg-muted/60 px-2.5 py-1 text-sm font-semibold">Azul</span>
      <label htmlFor="conf-tamanho" className="sr-only">
        Tamanho
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
          className="h-8 rounded-lg border border-border bg-card px-2 text-sm font-semibold"
        >
          {["40", "42", "44"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      ) : (
        <span className="tabular rounded-lg bg-violeta-500/15 px-2.5 py-1 text-sm font-semibold">Tam. {tamanho}</span>
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
        {confirmado ? "Confirmado na demonstração. Nada foi gravado." : "Experimente: corrija o tamanho e confirme · exemplo local"}
      </p>
    </div>
  );
}

export function GradeBeneficios({ onVerDemo }: { onVerDemo: () => void }) {
  return (
    <div className="px-3 pt-3" data-capitulo="claro">
      <section id="diferenciais" aria-labelledby="dif-titulo" className={cn(PAINEL, "painel-secao scroll-mt-24 border-border")}>
        <div className="max-w-3xl">
          <p className={cn(ETIQUETA, "text-violeta-600 dark:text-violeta-300")}>Como ajuda</p>
          <h2 id="dif-titulo" className={cn(TITULO, "mt-2")}>
            O “não tinha” de hoje vira a <span className="text-violeta-600 dark:text-neon-500">decisão de amanhã.</span>
          </h2>
          <p className="mt-3 text-lg leading-7 text-muted-foreground">Cinco passos simples, do balcão ao resultado.</p>
        </div>

        <Revelar modo="grupo" as="ol" className="mt-10">
          <Passo n={1} titulo="Fale do seu jeito" texto="O vendedor conta o que o cliente procurou, com as próprias palavras.">
            <p className="max-w-[34ch] rounded-2xl rounded-tl-sm bg-violeta-600 px-4 py-2.5 text-base leading-6 text-white">
              <Mic className="mr-1.5 inline size-4 align-[-2px]" aria-hidden />
              “Procuraram calça jeans azul, tamanho 42, e não tinha.”
            </p>
          </Passo>
          <Passo n={2} titulo="A IA preenche, você confere" texto="O agente monta o registro sozinho. Você só corrige, se precisar, e confirma.">
            <ExemploConferencia />
          </Passo>
          <Passo n={3} titulo="Veja o que ficou faltando" texto="As procuras aparecem juntas, por produto e tamanho.">
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
            <p className="mt-2 text-xs text-muted-foreground">Exemplo fictício · últimos 7 dias</p>
          </Passo>
          <Passo n={4} titulo="Escolha o próximo passo" texto="A sugestão vem com o motivo. Quem decide é você.">
            <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
              <li className="px-3 py-2">6 procuras registradas · saldo informado: 0</li>
              <li className="flex items-start gap-2 px-3 py-2 font-semibold">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-coral-500" aria-hidden /> Conferir o estoque e consultar o fornecedor
              </li>
            </ul>
          </Passo>
          <Passo n={5} ultimo titulo="Acompanhe o resultado" texto="Cada ação tem responsável e prazo. Depois, a loja compara o antes e o depois.">
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <CalendarDays className="size-4 shrink-0 text-violeta-500" aria-hidden /> Últimos 7 dias
              </li>
              <li className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <FileText className="size-4 shrink-0 text-violeta-500" aria-hidden /> Estoque informado às 09h
              </li>
              <li className="inline-flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <ListChecks className="size-4 shrink-0 text-violeta-500" aria-hidden /> Ação aberta
              </li>
            </ul>
          </Passo>
        </Revelar>

        <button type="button" onClick={onVerDemo} className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-violeta-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-violeta-700 sm:ml-[4.25rem]">
          Ver os cinco passos funcionando <Seta />
        </button>
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

const RELATORIOS = [
  {
    periodo: "7 dias",
    titulo: "Relatório da semana",
    linhas: [
      ["Receita", "R$ 12.800"],
      ["Ticket médio", "R$ 160"],
      ["O que mais vendeu", "Calças"],
      ["Mais procurado sem estoque", "Calça jeans azul 42"],
    ],
  },
  {
    periodo: "30 dias",
    titulo: "Relatório do mês",
    linhas: [
      ["Dia e horário mais forte", "Sábado, 10–12h"],
      ["Quem mais compra", "25 a 34 anos"],
      ["Clientes que voltaram", "2 ou mais compras"],
      ["Fase do mês que mais vende", "Início do mês"],
    ],
  },
] as const;

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
        {/* relatórios: o que a loja recebe pronto, sem digitar */}
        <div className="mt-10 grid gap-4 border-t border-white/10 pt-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">
              Relatório da semana e do mês, <span className="text-neon-500">pronto.</span>
            </h3>
            <p className="mt-3 text-base leading-7 text-tinta-300">
              Os números se preenchem sozinhos, com a planilha da loja e os registros do balcão. Ninguém precisa digitar.
            </p>
            <p className="mt-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-tinta-300">Na tela Meu público · 7, 30 ou 90 dias</p>
          </div>
          {RELATORIOS.map((r) => (
            <article key={r.titulo} className="min-w-0 rounded-[20px] border border-white/10 bg-[#141c34] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violeta-300">{r.periodo}</p>
              <h4 className="mt-1 text-lg font-semibold">{r.titulo}</h4>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {r.linhas.map(([rotulo, valor]) => (
                  <li key={rotulo} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2 last:border-0 last:pb-0">
                    <span className="text-tinta-300">{rotulo}</span>
                    <span className="text-right font-semibold">{valor}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          <p className="text-xs text-tinta-300 lg:col-span-3">Números ilustrativos de uma loja fictícia.</p>
        </div>
      </section>
    </div>
  );
}
