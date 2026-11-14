// Relatório da semana e do mês preenchido pelo agente, na página pública.
// Didático: o pedido aparece digitado, o agente conta de onde lê os números e as células da planilha
// se preenchem uma a uma. No fim, a pessoa baixa a planilha preenchida (abre no Excel ou no Google Planilhas).
// Nada aqui chama o backend: os valores são do exemplo da página.
import { Bot, Download, FileSpreadsheet, RotateCcw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNaTela } from "@/components/efeitos/Revelar";
import { baixarCsv } from "@/lib/csv";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export const RELATORIOS = [
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

const PEDIDO = "Monte o relatório da semana e do mês da loja.";
const PASSOS_AGENTE = [
  "Lendo a planilha de vendas e de estoque que a loja enviou…",
  "Somando os registros do balcão dos últimos 7 e 30 dias…",
  "Pronto. Confira os números e baixe a planilha.",
];
/** Linhas da planilha em ordem de preenchimento: [relatório, linha]. */
const CELULAS = RELATORIOS.flatMap((r, i) => r.linhas.map((_, j) => [i, j] as const));

type Fase = "parado" | "digitando" | "lendo" | "preenchendo" | "pronto";

export function RelatorioAgente() {
  const menos = useMenosMovimento();
  const [ref, naTela] = useNaTela<HTMLDivElement>("0px 0px -25% 0px");
  const [fase, setFase] = useState<Fase>("parado");
  const [letras, setLetras] = useState(0);
  const [passo, setPasso] = useState(-1);
  const [cheias, setCheias] = useState(0);
  const timers = useRef<number[]>([]);

  const limpar = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  const depois = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  const rodar = useCallback(() => {
    limpar();
    if (menos) {
      setLetras(PEDIDO.length);
      setPasso(PASSOS_AGENTE.length - 1);
      setCheias(CELULAS.length);
      setFase("pronto");
      return;
    }
    setLetras(0);
    setPasso(-1);
    setCheias(0);
    setFase("digitando");
    let t = 0;
    for (let i = 1; i <= PEDIDO.length; i++) {
      t += 32;
      depois(t, () => setLetras(i));
    }
    t += 350;
    depois(t, () => {
      setFase("lendo");
      setPasso(0);
    });
    t += 1100;
    depois(t, () => setPasso(1));
    t += 900;
    depois(t, () => setFase("preenchendo"));
    for (let i = 1; i <= CELULAS.length; i++) {
      t += 380;
      depois(t, () => setCheias(i));
    }
    t += 300;
    depois(t, () => {
      setPasso(2);
      setFase("pronto");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menos]);

  // começa sozinho quando a seção aparece (uma vez); "Preencher de novo" repete
  useEffect(() => {
    if (naTela && fase === "parado") rodar();
  }, [naTela, fase, rodar]);
  useEffect(() => limpar, []);

  const baixar = () =>
    baixarCsv("relatorio-da-loja-preenchido.csv", [
      ["Relatório da loja", "preenchido pelo agente"],
      [],
      ...RELATORIOS.flatMap((r) => [[r.titulo, r.periodo], ...r.linhas, []]),
    ]);

  const pronto = fase === "pronto";
  let n = 0; // índice global da célula, para saber o que já foi preenchido

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-6">
      {/* conversa com o agente */}
      <div className="flex min-w-0 flex-col">
        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight">
          Relatório da semana e do mês, <span className="text-neon-500">preenchido pelo agente.</span>
        </h3>
        <p className="mt-3 text-base leading-7 text-tinta-300">
          Você pede em texto. O agente lê a planilha da loja e os registros do balcão e preenche a planilha. Ninguém precisa digitar número.
        </p>

        <div className="mt-5 flex flex-1 flex-col gap-3 rounded-[20px] border border-white/10 bg-[#141c34] p-4 sm:p-5" aria-live="polite">
          <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-violeta-500 px-3.5 py-2.5 text-sm leading-6 text-white">
            {PEDIDO.slice(0, letras) || " "}
            {fase === "digitando" && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-white align-middle" aria-hidden />}
          </div>
          {passo >= 0 && (
            <div className="flex max-w-[92%] gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-neon-500/15 text-neon-500" aria-hidden>
                <Bot className="size-4" />
              </span>
              <ul className="flex flex-col gap-1.5 text-sm leading-6">
                {PASSOS_AGENTE.slice(0, passo + 1).map((p, i) => (
                  <li key={p} className={cn("filme-entra", i === passo && !pronto ? "text-white" : i === 2 ? "font-semibold text-neon-500" : "text-tinta-300")}>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={baixar}
              disabled={!pronto}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-neon-500 px-3 text-sm font-bold max-sm:w-full sm:px-4 text-tinta-950 transition-[transform,opacity] hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="size-4" aria-hidden /> Baixar planilha preenchida
            </button>
            <button
              type="button"
              onClick={rodar}
              className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/15 px-3 text-sm font-semibold text-tinta-200 max-sm:w-full sm:px-4 transition-colors hover:bg-white/10"
            >
              {pronto ? <RotateCcw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              {pronto ? "Preencher de novo" : "Preencher com o agente"}
            </button>
          </div>
        </div>
      </div>

      {/* planilha que vai sendo preenchida */}
      <div className="min-w-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1530]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm">
          <FileSpreadsheet className="size-4 text-neon-500" aria-hidden />
          <span className="truncate font-semibold">Planilha · relatório da loja</span>
          <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", pronto ? "bg-neon-500/15 text-neon-500" : "bg-white/10 text-tinta-300")}>
            {pronto ? "Preenchida" : fase === "preenchendo" ? `Preenchendo ${cheias}/${CELULAS.length}` : "Em branco"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px] border-collapse text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-[11px] text-tinta-300">
                <th className="w-8 border-b border-r border-white/10 py-1 font-medium" aria-hidden />
                <th className="border-b border-r border-white/10 px-3 py-1 text-left font-medium">A · Indicador</th>
                <th className="border-b border-white/10 px-3 py-1 text-left font-medium">B · Valor</th>
              </tr>
            </thead>
            {RELATORIOS.map((r) => (
              <tbody key={r.titulo}>
                <tr>
                  <td className="border-b border-r border-white/10 text-center text-[11px] text-tinta-400" aria-hidden />
                  <th colSpan={2} scope="colgroup" className="border-b border-white/10 bg-violeta-500/10 px-3 py-2 text-left">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violeta-300">{r.periodo}</span>
                    <span className="ml-2 font-semibold">{r.titulo}</span>
                  </th>
                </tr>
                {r.linhas.map(([rotulo, valor]) => {
                  const k = n++;
                  const cheia = k < cheias;
                  const atual = fase === "preenchendo" && k === cheias - 1;
                  return (
                    <tr key={rotulo}>
                      <td className="border-b border-r border-white/10 text-center text-[11px] tabular text-tinta-400">{k + 1}</td>
                      <td className="border-b border-r border-white/10 px-3 py-2 text-tinta-300">{rotulo}</td>
                      <td
                        className={cn(
                          "border-b border-white/10 px-3 py-2 font-semibold transition-colors duration-300",
                          atual ? "bg-neon-500/20 outline outline-2 -outline-offset-2 outline-neon-500" : cheia ? "text-white" : "text-transparent",
                        )}
                      >
                        {cheia ? valor : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </div>
  );
}
