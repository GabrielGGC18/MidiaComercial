// ChipPicker (SizePicker/ReasonPicker) · DemandQuickForm · DemandRanking
import { CheckCircle2, Search, ShieldAlert, Undo2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { DemandaIn, Faixa, ItemRanking, Motivo, ProdutoCatalogo } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FAIXAS, MOTIVOS, numero } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Confirmacao } from "./destaques";

export function ChipPicker<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  grande,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T | null;
  onChange: (v: T | null) => void;
  grande?: boolean;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-[13px] font-semibold">{rotulo}</legend>
      <div role="radiogroup" className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const sel = o.valor === valor;
          return (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => onChange(sel ? null : o.valor)}
              className={cn(
                "rounded-sm border font-medium transition-colors duration-150",
                grande ? "min-h-12 min-w-14 px-4 text-base" : "min-h-11 min-w-11 px-3 text-sm",
                sel
                  ? "border-violeta-500 bg-violeta-500 text-white shadow-sm"
                  : "border-border bg-card hover:border-violeta-300 hover:bg-violeta-50 dark:hover:bg-violeta-900/30",
              )}
            >
              {o.rotulo}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const OPCOES_MOTIVO = (Object.keys(MOTIVOS) as Motivo[]).map((m) => ({ valor: m, rotulo: MOTIVOS[m] }));

/**
 * Registro no balcão em ≤ 4 toques: busca → tamanho → (cor) → motivo → registrar.
 * Não faz fetch: recebe resultados da busca por props (§6.1).
 */
export function DemandQuickForm({
  resultados,
  buscando,
  onBuscar,
  onRegistrar,
  enviando,
  ultimo,
  onDesfazer,
}: {
  resultados: ProdutoCatalogo[];
  buscando: boolean;
  onBuscar: (q: string) => void;
  onRegistrar: (d: DemandaIn) => Promise<unknown>;
  enviando: boolean;
  ultimo: { id: number; rotulo: string; motivo: string } | null;
  onDesfazer: (id: number) => void;
}) {
  const idBusca = useId();
  const [q, setQ] = useState("");
  const [produto, setProduto] = useState<ProdutoCatalogo | null>(null);
  const [tamanho, setTamanho] = useState<string | null>(null);
  const [cor, setCor] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [faixa, setFaixa] = useState<Faixa | null>(null);

  useEffect(() => {
    const t = setTimeout(() => onBuscar(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q, onBuscar]);

  const escolher = (p: ProdutoCatalogo) => {
    setProduto(p);
    setTamanho(p.tamanhos.length === 1 ? p.tamanhos[0] : null);
    setCor(p.cores.length === 1 ? p.cores[0] : null);
  };
  const limpar = () => {
    setProduto(null);
    setTamanho(null);
    setCor(null);
    setMotivo(null);
    setFaixa(null);
    setQ("");
  };

  const textoLivre = !produto && q.trim().length >= 3;
  const pronto = !!motivo && (produto ? (produto.tamanhos.length === 0 || !!tamanho) : textoLivre);

  const enviar = async () => {
    if (!pronto || !motivo) return;
    await onRegistrar(
      produto
        ? { produto_id: produto.id, tamanho, cor, motivo, ...(faixa ? { faixa_etaria: faixa } : {}) }
        : { produto_texto: q.trim(), motivo, ...(faixa ? { faixa_etaria: faixa } : {}) },
    );
    if ("vibrate" in navigator) navigator.vibrate?.(30);
    limpar();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 1. O quê? */}
      {!produto ? (
        <div>
          <label htmlFor={idBusca} className="mb-2 block text-[13px] font-semibold">
            O quê?
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id={idBusca}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="camiseta azul, calça 42…"
              className="h-14 pl-11 text-base"
              autoComplete="off"
              enterKeyHint="search"
            />
          </div>
          <ul className="mt-2 flex flex-col gap-1.5" aria-label="Produtos encontrados" aria-busy={buscando}>
            {resultados.slice(0, 6).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => escolher(p)}
                  className="flex min-h-12 w-full items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-left hover:border-violeta-300 hover:bg-violeta-50 dark:hover:bg-violeta-900/30"
                >
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">{p.categoria}</span>
                </button>
              </li>
            ))}
          </ul>
          {textoLivre && !buscando && resultados.length === 0 && (
            <p className="mt-2 text-[13px] text-muted-foreground">
              Não está no catálogo. Escolha o motivo e registre como “{q.trim()}”.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-md bg-violeta-50 px-4 py-3 dark:bg-violeta-900/30">
          <div>
            <p className="sobretitulo text-violeta-700 dark:text-violeta-100">Produto</p>
            <p className="font-semibold">{produto.nome}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={limpar}>
            Trocar
          </Button>
        </div>
      )}

      {/* 2. Tamanho / cor */}
      {produto && produto.tamanhos.length > 1 && (
        <ChipPicker
          rotulo="Tamanho"
          grande
          opcoes={produto.tamanhos.map((t) => ({ valor: t, rotulo: t }))}
          valor={tamanho}
          onChange={setTamanho}
        />
      )}
      {produto && produto.cores.length > 1 && (
        <ChipPicker
          rotulo="Cor"
          opcoes={produto.cores.map((c) => ({ valor: c, rotulo: c }))}
          valor={cor}
          onChange={setCor}
        />
      )}

      {/* 3. Por quê? */}
      {(produto || textoLivre) && (
        <ChipPicker rotulo="Por quê?" opcoes={OPCOES_MOTIVO} valor={motivo} onChange={setMotivo} grande />
      )}

      {/* opcional: não conta nos 4 toques */}
      {(produto || textoLivre) && (
        <ChipPicker rotulo="Idade aproximada (opcional)" opcoes={FAIXAS} valor={faixa} onChange={setFaixa} />
      )}

      <Confirmacao tom="coral">
        <Button variant="balcao" disabled={!pronto} carregando={enviando} onClick={enviar}>
          Registrar
        </Button>
      </Confirmacao>

      <div aria-live="polite" className="min-h-14">
        {ultimo && (
          <div className="flex animate-entrar items-center gap-3 rounded-md border border-sinal-ok/30 bg-sinal-ok-bg px-4 py-3 text-sinal-ok-tx dark:bg-sinal-ok/10 dark:text-sinal-ok">
            <CheckCircle2 className="size-6 shrink-0 animate-check" aria-hidden />
            <p className="flex-1 text-sm">
              <strong>Registrado!</strong> {ultimo.rotulo} · {ultimo.motivo.toLowerCase()}
            </p>
            <Button variant="ghost" size="sm" onClick={() => onDesfazer(ultimo.id)}>
              <Undo2 aria-hidden /> Desfazer
            </Button>
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="size-4 shrink-0" aria-hidden />
        Não digite nome, telefone ou CPF do cliente.
      </p>
    </div>
  );
}

export function DemandRanking({ itens }: { itens: ItemRanking[] }) {
  const max = Math.max(1, ...itens.map((i) => i.total));
  return (
    <ol className="flex flex-col gap-3">
      {itens.map((it, idx) => (
        <li key={it.chave} className={cn("rounded-md p-3", idx === 0 && "bg-coral-100/60 dark:bg-coral-700/15")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="font-medium">
              <span className="mr-2 text-xs font-bold text-muted-foreground tabular">{idx + 1}º</span>
              {it.rotulo}
              {it.sku && <span className="ml-2 font-mono text-xs text-muted-foreground">{it.sku}</span>}
              {!it.no_catalogo && (
                <span className="ml-2 rounded-sm border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">fora do catálogo</span>
              )}
            </p>
            <p className="text-sm tabular">
              <strong className="font-display text-base">{numero(it.total)}</strong>{" "}
              <span className="text-muted-foreground">procuras</span>
              {it.saldo !== null && (
                <span className={cn("ml-2 text-xs", it.saldo === 0 ? "font-semibold text-coral-700 dark:text-coral-500" : "text-muted-foreground")}>
                  · saldo {it.saldo}
                </span>
              )}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden bg-muted" aria-hidden>
            <div className="h-full bg-coral-500" style={{ width: `${(it.total / max) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {Object.entries(it.por_motivo)
              .sort((a, b) => b[1] - a[1])
              .map(([m, n]) => `${MOTIVOS[m] ?? m}: ${n}`)
              .join(" · ")}
          </p>
        </li>
      ))}
    </ol>
  );
}
