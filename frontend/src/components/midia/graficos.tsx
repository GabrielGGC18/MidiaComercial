// CategoryBars · HeatmapWeek · SerieReceita (Recharts herda tokens via CSS vars)
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoriaPublico } from "@/api/types";
import { DIAS_SEMANA, data, moeda, numero, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Unidade = "receita" | "unidades" | "pedidos";

export function CategoryBars({ dados, unidade }: { dados: CategoriaPublico[]; unidade: Unidade }) {
  const valor = (c: CategoriaPublico) => Number(c[unidade]);
  const total = dados.reduce((s, c) => s + valor(c), 0) || 1;
  const ordenado = [...dados].sort((a, b) => valor(b) - valor(a));
  const max = Math.max(1, ...ordenado.map(valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {ordenado.map((c) => (
        <li key={c.categoria} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate font-medium">{c.categoria}</span>
          <span className="h-6 overflow-hidden rounded-sm bg-muted">
            <span
              className="block h-full rounded-sm bg-violeta-500 transition-all duration-500"
              style={{ width: `${(valor(c) / max) * 100}%` }}
            />
          </span>
          <span className="w-28 text-right tabular">
            <strong>{unidade === "receita" ? moeda(valor(c)) : numero(valor(c))}</strong>{" "}
            <span className="text-xs text-muted-foreground">{pct((valor(c) / total) * 100)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const ESCALA = ["#F1EEFF", "#A898FF", "#6D4AFF", "#2A1677"];

export function HeatmapWeek({
  celulas,
  horaIni = 9,
  horaFim = 18,
}: {
  celulas: { dia: number; hora: number; pedidos: number }[];
  horaIni?: number;
  horaFim?: number;
}) {
  const [verTabela, setVerTabela] = useState(false);
  const mapa = new Map(celulas.map((c) => [`${c.dia}-${c.hora}`, c.pedidos]));
  const max = Math.max(1, ...celulas.map((c) => c.pedidos));
  const horas = Array.from({ length: horaFim - horaIni + 1 }, (_, i) => horaIni + i);
  const dias = [0, 1, 2, 3, 4, 5, 6];
  const cor = (n: number) => {
    if (!n) return "var(--color-muted)";
    const p = n / max;
    return ESCALA[Math.min(3, Math.floor(p * 4))];
  };
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1 text-xs" aria-describedby="heat-legenda">
          <thead>
            <tr>
              <th className="w-10" />
              {horas.map((h) => (
                <th key={h} scope="col" className="font-medium text-muted-foreground tabular">
                  {h}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dias.map((d) => (
              <tr key={d}>
                <th scope="row" className="pr-1 text-left font-medium text-muted-foreground">
                  {DIAS_SEMANA[d]}
                </th>
                {horas.map((h) => {
                  const n = mapa.get(`${d}-${h}`) ?? 0;
                  return (
                    <td key={h} className="p-0">
                      <span
                        className="block h-7 min-w-7 rounded-sm"
                        style={{ background: cor(n) }}
                        title={`${DIAS_SEMANA[d]} ${h}h: ${n} pedidos`}
                      >
                        <span className="sr-only">
                          {DIAS_SEMANA[d]} {h}h: {n} pedidos
                        </span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div id="heat-legenda" className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          Menos
          {ESCALA.map((c) => (
            <span key={c} className="size-3.5 rounded-sm" style={{ background: c }} aria-hidden />
          ))}
          Mais pedidos
        </span>
        <button type="button" className="font-medium text-primary hover:underline" onClick={() => setVerTabela((v) => !v)}>
          {verTabela ? "Esconder dados" : "Ver dados"}
        </button>
      </div>
      {verTabela && (
        <ul className="mt-2 grid grid-cols-2 gap-x-4 text-xs sm:grid-cols-4">
          {[...celulas]
            .sort((a, b) => b.pedidos - a.pedidos)
            .slice(0, 12)
            .map((c) => (
              <li key={`${c.dia}-${c.hora}`} className="tabular">
                {DIAS_SEMANA[c.dia]} {c.hora}h: <strong>{c.pedidos}</strong>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function SerieReceita({ serie, className }: { serie: { data: string; receita: string }[]; className?: string }) {
  const dados = serie.map((p) => ({ data: p.data, receita: Number(p.receita) }));
  return (
    <div className={cn("h-56 w-full", className)} role="img" aria-label="Receita por dia no período">
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="data"
            tickFormatter={(d) => data(d)}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(v) => [moeda(Number(v)), "Receita"]}
            labelFormatter={(d) => data(String(d))}
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Area type="monotone" dataKey="receita" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gradReceita)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
