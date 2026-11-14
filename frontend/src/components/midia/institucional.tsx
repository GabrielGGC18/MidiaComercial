// Seções da página pública (/): quem somos, segmentos, como funciona e rodapé. A abertura, o bento e os
// caminhos estão em vitrine.tsx. Fotos: public/fotos (Unsplash, ver CREDITOS.md).
// Prints: public/telas (demo com dados sintéticos).
import { LogoAnimado, LogoIcone } from "./marca";
import {
  BadgeCheck,
  Bot,
  CalendarClock,
  Clock3,
  LayoutDashboard,
  Mic,
  PackageX,
  SearchX,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { CartaoExploravel, Entrada, FaixaRolante, Revelar, TextoEmRotacaoGradiente } from "./destaques";
import { cn } from "@/lib/utils";

/* ───────────────────────── peças ───────────────────────── */

/** Print dentro de uma "janela" de navegador (barra com 3 pontos e título). */
function JanelaPrint({ titulo, src, alt, className }: { titulo: string; src: string; alt: string; className?: string }) {
  return (
    <figure className={cn("flex h-full flex-col overflow-hidden rounded-lg border border-tinta-700 bg-tinta-900 shadow-[0_24px_60px_-20px_rgb(11_16_32/0.55)]", className)}>
      <figcaption className="flex h-8 shrink-0 items-center gap-1.5 border-b border-tinta-700 px-3">
        <span className="size-2 rounded-full bg-neon-600 dark:bg-neon-500" aria-hidden />
        <span className="size-2 rounded-full bg-ambar" aria-hidden />
        <span className="size-2 rounded-full bg-sinal-ok" aria-hidden />
        <span className="ml-2 truncate font-mono text-[11px] text-tinta-300">{titulo}</span>
      </figcaption>
      <img src={src} alt={alt} decoding="async" className="min-h-0 flex-1 object-cover object-left-top" />
    </figure>
  );
}

/** Card com foto: zoom suave no hover, etiqueta sobre a foto e luz que segue o cursor. */
function FotoCard({
  foto,
  etiqueta,
  titulo,
  children,
  className,
}: {
  foto: string;
  etiqueta: string;
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <CartaoExploravel className={cn("group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-bloco", className)}>
      <div className="relative h-44 overflow-hidden">
        <Revelar modo="recorte" className="size-full">
          <img src={foto} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        </Revelar>
        <div className="absolute inset-0 bg-gradient-to-t from-tinta-950/70 via-tinta-950/10 to-transparent" aria-hidden />
        <span className="absolute bottom-3 left-3 rounded-sm bg-card/90 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-violeta-700 backdrop-blur dark:text-violeta-100">
          {etiqueta}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-h3 font-bold">{titulo}</h3>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
      </div>
    </CartaoExploravel>
  );
}

function CabecalhoSecao({ sobre, titulo, texto, id }: { sobre: string; titulo: string; texto?: string; id?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="sobretitulo text-neon-700 dark:text-neon-500">{sobre}</p>
      <h2 id={id} className="titulo-secao mt-2">
        {titulo}
      </h2>
      {texto && <p className="mt-3 text-base leading-7 text-muted-foreground">{texto}</p>}
    </div>
  );
}

/* ───────────────────────── faixa rolante ───────────────────────── */

const FUNCOES = [
  { Icone: SearchX, t: "Venda perdida medida" },
  { Icone: Mic, t: "Registro por voz no balcão" },
  { Icone: Users, t: "Público por faixa de idade" },
  { Icone: Clock3, t: "Horário forte por nicho" },
  { Icone: CalendarClock, t: "Efeito salário no mês" },
  { Icone: PackageX, t: "Estoque parado" },
  { Icone: LayoutDashboard, t: "3 decisões por semana" },
  { Icone: Bot, t: "Agente de vendas" },
  { Icone: ShieldCheck, t: "LGPD e consentimento" },
];

export function FaixaFuncoes() {
  return (
    <div className="border-y border-tinta-800 bg-tinta-950 text-tinta-100">
      <FaixaRolante
        itens={FUNCOES.map(({ Icone, t }) => (
          <span key={t} className="inline-flex items-center gap-2 text-sm font-semibold">
            <Icone className="size-4 text-neon-500" aria-hidden /> {t}
          </span>
        ))}
      />
    </div>
  );
}

/* ───────────────────────── o que somos / quem somos ───────────────────────── */

// Iniciais em vez de foto: não depende de serviço externo e funciona offline na apresentação.
const EQUIPE = [
  { nome: "Gabriel Mendes", iniciais: "GM" },
  { nome: "joaocrosara", iniciais: "JC" },
  { nome: "Arthur Guedes Brito", iniciais: "AG" },
  { nome: "danielmiyke", iniciais: "DM" },
  { nome: "Mario Matheus Pombal (orientador)", iniciais: "MP", orientador: true },
] as const;

export function SobreNos() {
  return (
    <section id="sobre" aria-labelledby="sobre-titulo" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8">
      <CabecalhoSecao
        id="sobre-titulo"
        sobre="Quem somos"
        titulo="O caixa mostra o que vendeu. Nós mostramos o resto."
        texto="Ajudamos cada lojista a entender o próprio público e as oportunidades da loja."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Entrada>
          <FotoCard foto="/fotos/loja.webp" etiqueta="O que somos" titulo="Inteligência comercial ao lado do caixa">
            Junta vendas, estoque, público e <strong className="text-foreground">o que o cliente procurou e não levou</strong>.
          </FotoCard>
        </Entrada>
        <Entrada atraso={120}>
          <FotoCard foto="/fotos/sacolas.webp" etiqueta="Para que serve" titulo="Transformar sinais em vendas">
            Mostra <strong className="text-foreground">quem compra, o quê e quando</strong>, o que falta e o que está parado.
          </FotoCard>
        </Entrada>
        <Entrada atraso={240}>
          <FotoCard foto="/fotos/capim-dourado.webp" etiqueta="Quem somos" titulo="Equipe NidoQueen">
            <p>Criado no Hackrun em Palmas, depois de visitas a lojistas do Capim Dourado Shopping. Orientação de Mario Matheus Pombal.</p>
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Equipe NidoQueen">
              {EQUIPE.map((p) => (
                <li
                  key={p.nome}
                  title={p.nome}
                  className={cn(
                    "grid size-9 place-items-center rounded-sm text-[11px] font-bold",
                    "orientador" in p
                      ? "bg-neon-100 text-neon-700 dark:bg-neon-500/15 dark:text-neon-300"
                      : "bg-violeta-50 text-violeta-700 dark:bg-violeta-900/60 dark:text-violeta-100",
                  )}
                >
                  <span aria-hidden>{p.iniciais}</span>
                  <span className="sr-only">{p.nome}</span>
                </li>
              ))}
            </ul>
          </FotoCard>
        </Entrada>
      </div>
    </section>
  );
}

/** Coluna com foto ao lado do card de login. */
export function PainelEntrada() {
  return (
    <div className="relative hidden min-h-[520px] overflow-hidden rounded-lg lg:block">
      <img src="/fotos/caixa.webp" alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-violeta-900/95 via-violeta-900/55 to-violeta-900/10" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 p-8 text-white">
        <p className="sobretitulo text-violeta-100">Entre na sua loja</p>
        <p className="mt-2 font-display text-h2 font-extrabold leading-tight">Do balcão à decisão, no mesmo lugar.</p>
        <ul className="mt-5 flex flex-col gap-2.5 text-sm text-violeta-50">
          {["Gerente vê oportunidades, público e o agente", "Atendente registra no balcão por voz ou toque", "Cada loja vê só os próprios dados"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <BadgeCheck className="size-4 shrink-0 text-neon-500" aria-hidden /> {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ───────────────────────── segmentos ───────────────────────── */

const SEGMENTOS = [
  { foto: "/fotos/moda.webp", nome: "Moda", sinal: "Calças lideram a receita; pico no sábado das 12h às 14h" },
  { foto: "/fotos/calcados.webp", nome: "Calçados", sinal: "Tênis 41 procurado 7 vezes, sem estoque" },
  { foto: "/fotos/eletronicos.webp", nome: "Eletrônicos", sinal: "Fone parado há 40 dias: o agente sugere clientes" },
  { foto: "/fotos/presentes.webp", nome: "Presentes", sinal: "Vendas fortes do dia 1 ao 10 (efeito salário)" },
];

export function Segmentos() {
  return (
    <section id="segmentos" aria-labelledby="segmentos-titulo" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8">
      <CabecalhoSecao
        id="segmentos-titulo"
        sobre="Para cada loja do shopping"
        titulo="Um segmento, um público, os mesmos sinais"
        texto="O contrato de dados trabalha com produto, categoria e variante. Serve para moda, calçados, eletrônicos, presentes e outros segmentos."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {SEGMENTOS.map((s, i) => (
          <Entrada key={s.nome} atraso={i * 90}>
            <article className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-tinta-900">
              <img src={s.foto} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-tinta-950 via-tinta-950/40 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <h3 className="font-display text-h3 font-extrabold">{s.nome}</h3>
                <p className="mt-2 translate-y-1 border-l-2 border-neon-500 pl-3 text-sm leading-5 text-tinta-100 opacity-90 transition group-hover:translate-y-0 group-hover:opacity-100">
                  {s.sinal}
                </p>
              </div>
            </article>
          </Entrada>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Sinais ilustrativos. A demonstração usa duas lojas de moda com dados sintéticos.</p>
    </section>
  );
}

/* ───────────────────────── como funciona ───────────────────────── */

type Passo = { n: string; etapa: string; titulo: string; texto: string; exemplo: string; print: string; alt: string; Icone: typeof Bot; celular?: boolean };

const PASSOS: Passo[] = [
  {
    n: "01",
    etapa: "Sinal",
    titulo: "Balcão: o que o cliente não achou",
    texto: "O atendente fala ou toca no celular. Sem dado pessoal do cliente.",
    exemplo: "“procurou calça jeans 42, uns 40 anos, não tinha”",
    print: "/telas/balcao.webp",
    alt: "Tela do Balcão no celular, com botão de microfone e busca de produto",
    Icone: Smartphone,
    celular: true,
  },
  {
    n: "02",
    etapa: "Sinal",
    titulo: "Procuraram e não tinha: a venda que o caixa não vê",
    texto: "Ranking por produto, com motivo e saldo atual.",
    exemplo: "Camiseta básica Azul M · 9 procuras · saldo 0",
    print: "/telas/demanda.webp",
    alt: "Ranking de produtos procurados e não encontrados",
    Icone: SearchX,
  },
  {
    n: "03",
    etapa: "Entender",
    titulo: "Meu público: quem compra, o quê e quando",
    texto: "Categoria líder, horário de pico e faixa de idade.",
    exemplo: "Calças lideram (39,5%) · pico sábado 12–14h · 25–34 anos",
    print: "/telas/publico.webp",
    alt: "Painel Meu público com receita, categorias e mapa de horários",
    Icone: Users,
  },
  {
    n: "04",
    etapa: "Decidir",
    titulo: "Oportunidades: até 3 decisões por semana",
    texto: "Cada cartão mostra a evidência e a limitação. Você cria a ação ou descarta.",
    exemplo: "Investigar reposição: 9 procuraram · saldo informado = 0",
    print: "/telas/oportunidades.webp",
    alt: "Tela de Oportunidades com cartão priorizado e evidências",
    Icone: LayoutDashboard,
  },
  {
    n: "05",
    etapa: "Agir e medir",
    titulo: "Agente de vendas: quem chamar para o produto parado",
    texto: "Encontra clientes que autorizaram contato e escreve a mensagem. Você aprova e envia.",
    exemplo: "Oferecer Camisa social Branca G · já comprou Camisas · veste G",
    print: "/telas/agente.webp",
    alt: "Agente de vendas com campanha, funil e clientes sugeridos",
    Icone: Bot,
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="relative scroll-mt-24 py-16">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <CabecalhoSecao
          id="como-funciona-titulo"
          sobre="Como funciona"
          titulo="Do balcão à venda, em 4 etapas"
          texto="O sistema mostra o que fazer e mede o resultado. Ele propõe; uma pessoa confirma."
        />
        <ol className="mt-16 flex flex-col gap-20">
          {PASSOS.map((p, i) => {
            const { Icone } = p;
            const inv = i % 2 === 1;
            return (
              <li key={p.n}>
                <Entrada className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                  <div className={cn(inv && "md:order-2")}>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-5xl font-extrabold text-violeta-500/25 tabular dark:text-violeta-300/25" aria-hidden>{p.n}</span>
                      <span className="sobretitulo inline-flex items-center gap-1.5 rounded-sm bg-neon-100 px-2 py-1 text-neon-700 dark:bg-neon-500/15 dark:text-neon-300">
                        <Icone className="size-3.5" aria-hidden /> {p.etapa}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-h2 font-extrabold leading-tight">{p.titulo}</h3>
                    <p className="mt-3 text-base leading-7 text-muted-foreground">{p.texto}</p>
                    <p className="mt-4 inline-block border border-dashed border-violeta-300 bg-violeta-50/70 px-3 py-2 text-sm font-medium text-violeta-700 dark:bg-violeta-900/30 dark:text-violeta-100">
                      {p.exemplo}
                    </p>
                  </div>
                  <div className={cn("flex justify-center", inv && "md:order-1")}>
                    {p.celular ? (
                      <div className="w-full max-w-[240px] rounded-[1.6rem] border-[6px] border-tinta-900 bg-tinta-900 shadow-[0_30px_60px_-25px_rgb(11_16_32/0.6)]">
                        <img src={p.print} alt={p.alt} loading="lazy" decoding="async" width={390} height={844} className="h-auto w-full rounded-[1.1rem]" />
                      </div>
                    ) : (
                      <JanelaPrint titulo={p.titulo.split(":")[0]} src={p.print} alt={p.alt} className="aspect-[16/10] w-full transition-transform duration-500 hover:-translate-y-1" />
                    )}
                  </div>
                </Entrada>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/* ───────────────────────── frase e rodapé ───────────────────────── */

export function FraseSinais() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-8">
      <p className="text-sm text-muted-foreground">Uma decisão começa quando você enxerga</p>
      <p className="mt-2 font-display text-[clamp(1.5rem,3.4vw,2.4rem)] font-extrabold">
        <TextoEmRotacaoGradiente frases={["o que vendeu", "o que procuraram e não tinha", "o que está parado", "quem pode voltar a comprar"]} />
      </p>
    </div>
  );
}

export function RodapeLogin() {
  return (
    <footer className="relative isolate overflow-hidden bg-tinta-950 text-tinta-300">
      {/* efeitos: linha de luz que corre, brilho da marca e o monograma gigante */}
      <span className="rodape-linha absolute inset-x-0 top-0 h-px" aria-hidden />
      <span className="brilho-marca pointer-events-none absolute -bottom-40 left-1/2 -z-10 h-80 w-[min(90%,720px)] -translate-x-1/2 opacity-70" aria-hidden />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 pt-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <LogoAnimado sobreEscuro />
          <p className="mt-3 text-sm">Equipe NidoQueen · Palmas, Tocantins</p>
        </div>
        <p className="max-w-md text-xs leading-5">
          Demonstração com dados sintéticos. Contato com cliente só com autorização (LGPD) e revisão de uma pessoa. Fotos: Unsplash e equipe.
        </p>
      </div>
      {/* monograma gigante, em cores cheias, com a faixa de luz passando por cima */}
      <div className="relative mx-auto mt-8 w-fit overflow-hidden" aria-hidden>
        <LogoIcone className="-mb-[3%] h-[clamp(6.5rem,26vw,19rem)]" />
        <span className="rodape-faixa pointer-events-none absolute inset-0" />
      </div>
    </footer>
  );
}
