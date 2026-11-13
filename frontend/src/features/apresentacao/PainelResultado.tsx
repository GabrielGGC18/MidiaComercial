// Região direita do palco: registro → indicadores → sugestão. A moldura fica fixa; só o conteúdo troca.
import { CheckCircle2, CircleDashed, History, Package, Receipt, Send, TriangleAlert, User, X } from "lucide-react";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CartaoExploravel } from "@/components/midia/destaques";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { moeda } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CLIENTE, FAIXA_DA_VENDA, mensagemContato, PECAS, VENDA } from "./cenario";
import type { EstadoPalco } from "./seletores";
import type { Percurso } from "./usePercurso";

const reais = (centavos: number) => moeda(centavos / 100);

/** Número que interpola até o valor do estado (nunca soma por conta própria). */
export function ValorNarrado({ valor, formatar }: { valor: number; formatar: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(valor);
  const menos = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (menos || anterior.current === valor) {
      el.textContent = formatar(valor);
      anterior.current = valor;
      return;
    }
    const c = animate(anterior.current, valor, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => (el.textContent = formatar(v)),
    });
    anterior.current = valor;
    return () => c.stop();
  }, [valor, formatar, menos]);
  return (
    <span ref={ref} className="tabular">
      {formatar(valor)}
    </span>
  );
}

const entrada = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.35, ease: "easeOut" } } as const;

function Campo({ rotulo, valor, origem, ativo }: { rotulo: string; valor: React.ReactNode; origem: string; ativo: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</dt>
      <dd className={cn("truncate text-sm font-semibold transition-colors duration-500", ativo ? "text-foreground" : "text-muted-foreground/50")}>
        {ativo ? valor : "aguardando"}
      </dd>
      {ativo && <span className="truncate text-[11px] text-muted-foreground">{origem}</span>}
    </div>
  );
}

function Grupo({ titulo, Icone, ativo, children }: { titulo: string; Icone: typeof User; ativo: boolean; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-md border p-3 transition-colors duration-500",
        ativo ? "border-violeta-500/40 bg-violeta-50/60 dark:bg-violeta-900/20" : "border-dashed border-border",
      )}
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icone className="size-3.5" aria-hidden /> {titulo}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

function RegistroVenda({ e }: { e: EstadoPalco }) {
  const checagens = e.temCliente
    ? ["Cliente localizado pelo código de origem", "Quantidade e valor conferidos", "Venda ainda não processada neste cenário"]
    : ["Quantidade e valor conferidos", "Venda ainda não processada neste cenário"];
  return (
    <motion.div {...entrada} className="flex flex-col gap-3">
      {e.vendaVisivel && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-l-[3px] border-border border-l-coral-500 bg-card p-3"
        >
          <Receipt className="size-4 text-coral-500" aria-hidden />
          <span className="font-mono text-xs font-medium">{VENDA.codigo}</span>
          <span className="text-sm font-semibold">
            {e.temCliente ? CLIENTE.nome : "Cliente não informado"} · {VENDA.produto} · {reais(VENDA.valor)}
          </span>
          <Badge tom="coral" className="ml-auto">{VENDA.origem}</Badge>
        </motion.div>
      )}

      <Grupo titulo="Cliente" Icone={User} ativo={e.grupos.cliente}>
        {e.temCliente ? (
          <>
            <Campo rotulo="Nome" valor={CLIENTE.nome} origem="Cadastro fictício" ativo={e.grupos.cliente} />
            <Campo rotulo="Código" valor={<span className="font-mono">{CLIENTE.codigo}</span>} origem="Veio na venda" ativo={e.grupos.cliente} />
            <Campo rotulo="Camisa" valor={CLIENTE.tamanhoCamisa} origem="Cadastro anterior" ativo={e.grupos.cliente} />
          </>
        ) : (
          <div className="col-span-full flex items-start gap-2 text-sm text-sinal-atencao-tx dark:text-sinal-atencao">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {e.grupos.cliente ? "Sem código de cliente na venda. O histórico individual fica pendente." : "aguardando"}
          </div>
        )}
      </Grupo>

      <Grupo titulo="Item" Icone={Package} ativo={e.grupos.item}>
        <Campo rotulo="Produto" valor={VENDA.produto} origem="Item da venda" ativo={e.grupos.item} />
        <Campo rotulo="Código" valor={<span className="font-mono">{VENDA.sku}</span>} origem="Item da venda" ativo={e.grupos.item} />
        <Campo rotulo="Quantidade" valor={VENDA.quantidade} origem="Item da venda" ativo={e.grupos.item} />
      </Grupo>

      <Grupo titulo="Venda" Icone={Receipt} ativo={e.grupos.transacao}>
        <Campo rotulo="Valor" valor={reais(VENDA.valor)} origem="Item da venda" ativo={e.grupos.transacao} />
        <Campo rotulo="Horário" valor={VENDA.horario} origem="Registro da venda" ativo={e.grupos.transacao} />
        <Campo rotulo="Estoque do boné" valor={`${e.estoqueBone} un.`} origem={e.validado ? "8 − 1 vendida" : "Saldo informado"} ativo={e.grupos.transacao} />
      </Grupo>

      {e.cap >= 2 && (
        <motion.ul {...entrada} className="flex flex-col gap-1.5 rounded-md border border-border p-3 text-sm" aria-label="Verificações">
          {checagens.map((c) => (
            <li key={c} className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-sinal-ok-tx dark:text-sinal-ok" aria-hidden /> {c}
            </li>
          ))}
          {e.comprasCliente !== null && (
            <li className="mt-1 flex items-center gap-2 border-t border-border pt-2 text-muted-foreground">
              <History className="size-4" aria-hidden /> Histórico de {CLIENTE.codigo}: {e.comprasCliente} compras
            </li>
          )}
        </motion.ul>
      )}
    </motion.div>
  );
}

const fmtPedidos = (v: number) => String(Math.round(v));
const fmtReais = (v: number) => reais(Math.round(v));

function PainelIndicadores({ e }: { e: EstadoPalco }) {
  const dados = e.serie.map((p) => ({ faixa: p.faixa, receita: p.receita / 100 }));
  const kpis = [
    { rotulo: "Pedidos no dia", valor: e.kpis.pedidos, antes: e.kpisAntes.pedidos, fmt: fmtPedidos },
    { rotulo: "Receita do dia", valor: e.kpis.receita, antes: e.kpisAntes.receita, fmt: fmtReais },
    { rotulo: "Ticket médio", valor: e.kpis.ticket, antes: e.kpisAntes.ticket, fmt: fmtReais },
  ];
  return (
    <motion.div {...entrada} className="flex flex-col gap-3">
      <dl className="grid grid-cols-3 gap-2">
        {kpis.map((k) => (
          <div key={k.rotulo} className="rounded-md border border-border bg-card p-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.rotulo}</dt>
            <dd className="mt-1 font-display text-lg font-extrabold sm:text-xl">
              <ValorNarrado valor={k.valor} formatar={k.fmt} />
            </dd>
            {/* mudança neutra: não pinta como melhora nem piora */}
            <p className="text-[11px] text-muted-foreground">antes: {k.fmt(k.antes)}</p>
          </div>
        ))}
      </dl>
      <figure className="rounded-md border border-border bg-card p-3">
        <figcaption className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground">
          Receita por hora
          <span className="inline-flex items-center gap-1 text-coral-700 dark:text-coral-500">
            <span className="size-2 rounded-full bg-coral-500" aria-hidden /> {FAIXA_DA_VENDA}: inclui {VENDA.codigo}
          </span>
        </figcaption>
        <div className="h-40" aria-hidden>
          <ResponsiveContainer>
            <BarChart data={dados} margin={{ top: 18, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="faixa" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 350]} ticks={[0, 100, 200, 300]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
              <Bar dataKey="receita" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {dados.map((d) => (
                  <Cell key={d.faixa} fill={d.faixa === FAIXA_DA_VENDA ? "var(--chart-2)" : "var(--chart-1)"} />
                ))}
                <LabelList
                  dataKey="receita"
                  position="top"
                  fontSize={10}
                  fill="var(--color-muted-foreground)"
                  formatter={(v: unknown) => String(Math.round(Number(v)))}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver tabela de valores</summary>
          <table className="mt-2 w-full tabular">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="font-medium">Faixa</th>
                <th className="text-right font-medium">Receita</th>
              </tr>
            </thead>
            <tbody>
              {e.serie.map((p) => (
                <tr key={p.faixa}>
                  <td>{p.faixa}</td>
                  <td className="text-right">{reais(p.receita)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td>Total</td>
                <td className="text-right">{reais(e.kpis.receita)}</td>
              </tr>
            </tbody>
          </table>
        </details>
      </figure>
    </motion.div>
  );
}

function SugestaoPosVenda({ e, p }: { e: EstadoPalco; p: Percurso }) {
  const peca = PECAS.find((x) => x.id === p.escolhas.pecaId) ?? PECAS[0]!;
  const texto = p.escolhas.mensagem ?? mensagemContato(peca);
  const [editando, setEditando] = useState(false);

  if (!e.temCliente) {
    return (
      <motion.div {...entrada} className="flex flex-col items-start gap-3 rounded-md border border-sinal-atencao/40 bg-sinal-atencao-bg/50 p-4 text-sm dark:bg-sinal-atencao/10">
        <p className="flex items-center gap-2 font-semibold text-sinal-atencao-tx dark:text-sinal-atencao">
          <TriangleAlert className="size-4" aria-hidden /> Sugestão individual indisponível
        </p>
        <p>Sem cliente identificado, não há para quem sugerir nem histórico para consultar. Os números da loja continuam atualizados.</p>
        <p className="text-muted-foreground">Para continuar: peça o código do cliente no caixa ou cadastre o cliente com autorização de contato.</p>
      </motion.div>
    );
  }

  return (
    <motion.div {...entrada} className="flex flex-col gap-3">
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Peças sugeridas">
        {e.sugestoes.map((s, i) => {
          const ativa = s.id === peca.id;
          return (
            <motion.li key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.09 }}>
              <CartaoExploravel
                className={cn(
                  "h-full rounded-md border bg-card p-3 text-sm transition-colors",
                  ativa ? "border-violeta-500 ring-1 ring-violeta-500/40" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => p.escolherPeca(s.id)}
                  aria-pressed={ativa}
                  className="flex w-full flex-col gap-1 text-left"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {s.nome} · {s.variante}
                    </span>
                    <span className="tabular font-semibold">{reais(s.preco)}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">Saldo {s.saldo} · {s.criterio}</span>
                  <span className="text-xs">{s.motivo}</span>
                  <span className="text-xs text-sinal-atencao-tx dark:text-sinal-atencao">Revisar: {s.revisar}</span>
                </button>
              </CartaoExploravel>
            </motion.li>
          );
        })}
      </ul>

      {e.emRevisao && (
        <motion.section {...entrada} className="rounded-md border border-border bg-card p-3" aria-label="Mensagem para revisar">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Mensagem sugerida para {CLIENTE.nome}</p>
            {e.revisao === "pendente" && (
              <Badge tom="atencao">
                <CircleDashed aria-hidden /> Aguardando sua revisão
              </Badge>
            )}
            {e.revisao === "aprovada" && (
              <Badge tom="ok">
                <CheckCircle2 aria-hidden /> Sugestão revisada
              </Badge>
            )}
            {e.revisao === "rejeitada" && (
              <Badge tom="neutro">
                <X aria-hidden /> Sugestão descartada
              </Badge>
            )}
          </div>
          {editando ? (
            <Textarea
              aria-label="Editar mensagem"
              value={texto}
              onChange={(ev) => p.editarMensagem(ev.target.value)}
              className="min-h-24 text-sm"
              autoFocus
            />
          ) : (
            <p className="rounded-md bg-muted/60 p-3 text-sm leading-6">{texto}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { setEditando(false); p.aprovar(); }} disabled={e.revisao === "aprovada"}>
              <CheckCircle2 aria-hidden /> Aprovar sugestão
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditando((v) => !v)}>
              {editando ? "Concluir edição" : "Editar texto"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditando(false); p.rejeitar(); }}>
              Rejeitar
            </Button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Send className="size-3" aria-hidden /> Demonstração: nada é enviado. No produto, o vendedor abre o WhatsApp e envia ele mesmo.
          </p>
        </motion.section>
      )}
    </motion.div>
  );
}

export function PainelResultado({ p }: { p: Percurso }) {
  const e = p.estado;
  if (e.cap <= 2) return <RegistroVenda key="registro" e={e} />;
  if (e.cap === 3) return <PainelIndicadores key="indicadores" e={e} />;
  return <SugestaoPosVenda key="sugestao" e={e} p={p} />;
}
