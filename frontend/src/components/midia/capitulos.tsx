// Capítulos da página inicial com o movimento do Pibaru adaptado ao nosso design de vendas:
// "escada" (problema em frase de impacto + cartão que respira) e "sanfona" (a semana da loja).
import { CalendarCheck, ChartColumnBig, Mic, PackageSearch, Send, Upload } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { indice, Revelar } from "./destaques";

// Ranking fictício do cartão, já em ordem (o mais procurado primeiro)
const RANKING = [
  { nome: "Calça jeans azul", tam: "42", n: 6 },
  { nome: "Tênis branco", tam: "41", n: 4 },
  { nome: "Camiseta básica", tam: "M", n: 3 },
];
const TOTAL_RANKING = RANKING.reduce((t, r) => t + r.n, 0);

/** Problema: a venda perdida que o caixa não registra. */
export function EscadaProblema() {
  const linhas = [
    { t: "O cliente pediu.", cls: "text-white" },
    { t: "Não tinha.", cls: "text-coral-500 pl-[8vw]" },
  ];
  const frase = [
    { t: "O caixa não registra.", cls: "pl-[6vw] sm:pl-[14vw] text-white" },
    { t: "O MidiaComercial anota", cls: "pl-[10vw] sm:pl-[20vw] text-violeta-300" },
    { t: "e mostra o que repor.", cls: "pl-[14vw] sm:pl-[26vw] text-sinal-ok" },
  ];
  return (
    <div className="px-3 pt-3" data-capitulo="coral">
      <section
        aria-labelledby="escada-titulo"
        className="relative mx-auto w-full max-w-[1280px] overflow-x-clip rounded-[28px] border border-white/10 bg-tinta-950 px-5 py-20 text-white sm:px-10 lg:px-14 lg:py-28"
      >
        <span className="brilho-sinal pointer-events-none absolute -right-24 top-10 h-80 w-80 opacity-60" aria-hidden />
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_minmax(280px,26vw)]">
          <div>
            <h2 id="escada-titulo" className="titulo-fino font-display text-[clamp(2.8rem,6.4vw,6rem)] font-bold leading-[0.92]">
              <Revelar modo="escada" as="span" className="block">
                {linhas.map((l, i) => (
                  <span key={l.t} className={cn("block", l.cls)} style={indice(i)}>
                    {l.t}
                  </span>
                ))}
              </Revelar>
            </h2>
            <Revelar modo="escada" className="mt-10 font-display text-[clamp(1.4rem,2.6vw,2.2rem)] font-bold leading-[1.15] tracking-tight">
              {frase.map((l, i) => (
                <span key={l.t} className={cn("block", l.cls)} style={indice(i + 1)}>
                  {l.t}
                </span>
              ))}
            </Revelar>
            <Revelar modo="marca" as="p" className="mt-14 max-w-[46ch] text-base leading-7 text-tinta-300">
              Quem saiu sem levar não aparece em relatório. Aqui o vendedor registra em{" "}
              <span className="marca-texto text-white">4 toques ou uma frase</span> e a loja vê a{" "}
              <span className="marca-texto text-white">venda que está perdendo</span>.
            </Revelar>
          </div>

          {/* cartão que entra inclinado e "respira" (o boletim do Pibaru, aqui: o ranking do balcão).
              Linhas na mesma grade: posição · produto + tamanho · contagem, com a barra embaixo. */}
          <Revelar modo="cartao" className="w-full rounded-2xl bg-white p-5 text-tinta-950 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] lg:self-center">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-coral-500/10 text-coral-600" aria-hidden>
                <PackageSearch className="size-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-5">Procuraram e não tinha</p>
                <p className="text-xs leading-5 text-tinta-500">Esta semana · {TOTAL_RANKING} procuras</p>
              </div>
            </div>
            <ol className="mt-4 flex flex-col gap-1.5 text-sm">
              {RANKING.map((r, i) => (
                <li
                  key={r.nome}
                  className={cn(
                    "grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 rounded-lg px-3 py-2.5",
                    i === 0 ? "pulo bg-coral-500 font-semibold text-white" : "bg-tinta-50",
                  )}
                >
                  <span className={cn("tabular text-xs font-semibold", i === 0 ? "text-white/80" : "text-tinta-500")}>{i + 1}º</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{r.nome}</span>
                    <span className={cn("tabular shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-4", i === 0 ? "bg-white/20" : "bg-white text-tinta-700")}>
                      {r.tam}
                    </span>
                  </span>
                  <span className="tabular w-5 text-right font-semibold">{r.n}</span>
                  <span className={cn("col-span-3 h-1 overflow-hidden rounded-full", i === 0 ? "bg-white/25" : "bg-tinta-200")} aria-hidden>
                    <span className={cn("block h-full rounded-full", i === 0 ? "bg-white" : "bg-coral-500")} style={{ width: `${(r.n / RANKING[0].n) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-tinta-100 pt-3 text-xs leading-5 text-tinta-500">Dados fictícios. Conta atendimentos, não pessoas.</p>
          </Revelar>
        </div>
      </section>
    </div>
  );
}

const DIAS = [
  {
    dia: "Segunda",
    titulo: "Os números entram",
    texto: "Você envia a planilha de vendas e estoque. O sistema confere e não duplica.",
    Icone: Upload,
    tom: "bg-tinta-950 text-white",
    etiquetas: ["vendas", "estoque", "clientes"],
  },
  {
    dia: "Terça",
    titulo: "O balcão conta o que faltou",
    texto: "Cada procura sem estoque vira registro, por toque ou voz.",
    Icone: Mic,
    tom: "bg-[#17154a] text-white",
    etiquetas: ["sem estoque", "sem tamanho"],
  },
  {
    dia: "Quarta",
    titulo: "Até três decisões",
    texto: "O que repor, o que está parado e quando o público compra.",
    Icone: ChartColumnBig,
    tom: "bg-violeta-700 text-white",
    etiquetas: ["repor", "parado", "horário forte"],
  },
  {
    dia: "Sexta",
    titulo: "Quem chamar e por quê",
    texto: "O agente sugere clientes que autorizaram contato e escreve a mensagem. O vendedor revisa e envia.",
    Icone: Send,
    tom: "bg-violeta-500 text-white",
    etiquetas: ["com autorização", "revisão humana"],
  },
  {
    dia: "Sábado",
    titulo: "Ver o que deu certo",
    texto: "Cada ação tem prazo e medida. Na semana seguinte, a loja compara.",
    Icone: CalendarCheck,
    tom: "bg-violeta-100 text-tinta-950",
    etiquetas: ["antes e depois"],
  },
];

/** Sanfona horizontal "do escuro ao claro": a rotina de vendas da semana. No celular, empilha. */
export function SemanaNaLoja() {
  const [aberto, setAberto] = useState(0);
  return (
    <div className="px-3 pt-3" data-capitulo="violeta">
      <section aria-labelledby="semana-titulo" className="painel-secao relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-[28px] border border-border px-3 py-14 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="semana-titulo" className="titulo-fino font-display text-[clamp(2rem,4.4vw,3.5rem)] font-bold leading-[1.02]">
            Uma semana
            <br />
            na sua loja
          </h2>
          <p className="max-w-md text-muted-foreground">Os dados entram, o balcão conta o que faltou e a loja decide.</p>
        </div>

        <Revelar modo="grupo" className="mt-10 flex flex-col overflow-hidden rounded-2xl lg:h-[440px] lg:flex-row">
          {DIAS.map((d, i) => {
            const ativo = i === aberto;
            return (
              <div
                key={d.dia}
                style={indice(i)}
                className={cn(
                  "sanfona-painel relative min-w-0 overflow-hidden",
                  d.tom,
                  ativo ? "lg:flex-[1_1_auto]" : "lg:flex-[0_0_76px] lg:hover:brightness-110",
                )}
              >
                <button
                  type="button"
                  onClick={() => setAberto(i)}
                  aria-expanded={ativo}
                  aria-controls={`dia-${i}`}
                  className={cn(
                    "flex h-16 w-full items-center px-5 text-left font-display text-lg font-bold lg:absolute lg:inset-0 lg:h-auto lg:items-end lg:p-6",
                    ativo && "lg:pointer-events-none lg:opacity-0",
                    ativo && "max-lg:hidden",
                  )}
                >
                  {/* rótulo vertical no desktop */}
                  <span className="lg:absolute lg:bottom-6 lg:left-6 lg:origin-bottom-left lg:whitespace-nowrap lg:[transform:rotate(-90deg)_translateY(100%)]">{d.dia}</span>
                </button>
                <div
                  id={`dia-${i}`}
                  hidden={!ativo}
                  className="relative flex flex-col gap-4 p-6 sm:p-8 lg:absolute lg:inset-0 lg:min-w-[520px] lg:p-10"
                >
                  <p className="text-sm font-semibold opacity-80">{d.dia}</p>
                  <h3 className="titulo-fino max-w-[16ch] font-display text-[clamp(1.6rem,3vw,2.6rem)] font-bold leading-[1.05]">{d.titulo}</h3>
                  <div className="flex flex-col gap-4 lg:mt-auto lg:max-w-[60%]">
                    <ul className="flex flex-wrap gap-2">
                      {d.etiquetas.map((e) => (
                        <li key={e} className="rounded-full bg-current/10 px-3 py-1 text-xs font-semibold">
                          {e}
                        </li>
                      ))}
                    </ul>
                    <p className="max-w-[38ch] text-base leading-7 opacity-90">{d.texto}</p>
                  </div>
                  <d.Icone className="absolute bottom-10 right-10 hidden size-28 opacity-25 lg:block" strokeWidth={1.2} aria-hidden />
                </div>
              </div>
            );
          })}
        </Revelar>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PackageSearch className="size-3.5" aria-hidden /> Toque em um dia para abrir.
        </p>
      </section>
    </div>
  );
}
