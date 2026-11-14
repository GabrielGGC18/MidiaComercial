import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Plus, Search, ShieldCheck, ShieldOff, Upload, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { api, json, mensagemErro } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import type { Cliente, Pagina } from "@/api/types";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/midia/estado";
import { LimitationNote } from "@/components/midia/sinais";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { FAIXAS, data, moeda, numero } from "@/lib/format";

function zap(w: string) {
  const d = w.replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : w;
}

export default function ClientesPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const filtros = {
    q: params.get("q") ?? "",
    faixa: params.get("faixa") ?? "",
    tamanho: params.get("tamanho") ?? "",
    categoria: params.get("categoria") ?? "",
    consentimento: params.get("consentimento") ?? "",
    pagina: params.get("pagina") ?? "",
  };
  const [q, setQ] = useState(filtros.q);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (k !== "pagina") p.delete("pagina"); // mudou filtro: volta para a página 1
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };
  useEffect(() => {
    const t = setTimeout(() => q !== filtros.q && set("q", q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const chave = useChaveLoja("clientes", qs);
  const pag = useQuery({
    queryKey: chave,
    queryFn: () => api<Pagina<Cliente> & { autorizados: number }>(`/api/clientes/?${qs}`),
    placeholderData: (prev) => prev, // a lista não pisca ao trocar de página
  });
  const lista = { ...pag, data: pag.data?.itens };

  const arquivo = useRef<HTMLInputElement>(null);
  const importar = useMutation({
    mutationFn: (f: File) => {
      const fd = new FormData();
      fd.append("arquivo", f);
      return api<{ criados: number; atualizados: number; rejeitados: { linha: number; erro: string }[] }>("/api/clientes/importar", { method: "POST", body: fd });
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(`${r.criados} criados, ${r.atualizados} atualizados${r.rejeitados.length ? `, ${r.rejeitados.length} com erro` : ""}.`);
      setRejeitados(r.rejeitados);
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const [rejeitados, setRejeitados] = useState<{ linha: number; erro: string }[]>([]);
  const [novo, setNovo] = useState(false);

  const sair = useMutation({
    mutationFn: (id: number) => api<Cliente>(`/api/clientes/${id}/sair`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clientes"] });
      toast("Consentimento revogado: o cliente não recebe mais mensagens.");
    },
  });

  const consentidos = pag.data?.autorizados ?? 0;

  return (
    <>
      <PageHeader
        titulo="Clientes"
        subtitulo="Sua planilha de clientes, pesquisável. Só aqui ficam nome e WhatsApp, sempre com consentimento."
        acoes={
          <>
            <input ref={arquivo} type="file" accept=".csv,.xlsx" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && importar.mutate(e.target.files[0])} />
            <Button variant="secondary" onClick={() => arquivo.current?.click()} carregando={importar.isPending}>
              <Upload aria-hidden /> Importar planilha
            </Button>
            <a href="/api/clientes/exportar" className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium shadow-xs hover:bg-muted">
              <Download className="size-4" aria-hidden /> Exportar
            </a>
            <Button onClick={() => setNovo(true)}>
              <Plus aria-hidden /> Novo
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, código, categoria…" className="pl-9" />
          </div>
          <Select aria-label="Faixa etária" value={filtros.faixa} onChange={(e) => set("faixa", e.target.value)}>
            <option value="">Qualquer idade</option>
            {FAIXAS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
          </Select>
          <Input aria-label="Tamanho" value={filtros.tamanho} onChange={(e) => set("tamanho", e.target.value.toUpperCase())} placeholder="Tamanho (M, 42…)" />
          <Select aria-label="Consentimento" value={filtros.consentimento} onChange={(e) => set("consentimento", e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Autorizou contato</option>
            <option value="false">Não autorizou</option>
          </Select>
        </CardContent>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{pag.data ? `${numero(pag.data.total)} clientes · ${numero(consentidos)} autorizaram contato` : " "}</span>
        <a href="/api/clientes/modelo" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          <FileSpreadsheet className="size-3.5" aria-hidden /> Modelo de planilha (CSV ou XLSX)
        </a>
      </div>

      {rejeitados.length > 0 && (
        <ul className="mt-3 rounded-md border border-erro/30 bg-erro-bg px-4 py-2 text-sm text-erro-tx dark:bg-erro/10 dark:text-erro">
          {rejeitados.slice(0, 8).map((r) => <li key={r.linha}>Linha {r.linha}: {r.erro}</li>)}
        </ul>
      )}

      <section className="mt-4">
        {lista.isError && <ErrorState mensagem={mensagemErro(lista.error)} onTentar={() => lista.refetch()} />}
        {lista.isLoading && <CardSkeleton linhas={5} />}
        {lista.data?.length === 0 && (
          <EmptyState titulo="Nenhum cliente encontrado" descricao="Ajuste os filtros ou importe sua planilha (CSV ou Excel)." />
        )}
        {!!lista.data?.length && (
          <div className="hidden max-h-[70dvh] overflow-auto rounded-lg border border-border bg-card shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-conteudo bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  {["Cliente", "Idade", "Tamanhos", "Compras", "Gasto", "Última", "Interesses", "Contato"].map((h) => (
                    <th key={h} scope="col" className="sobretitulo whitespace-nowrap px-3 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.data.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50">
                    <td className="px-3 py-2">
                      <span className="block font-semibold">{c.nome || "Sem nome"}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{c.ref}{c.whatsapp && ` · ${zap(c.whatsapp)}`}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular">{c.faixa_rotulo || "—"}</td>
                    <td className="px-3 py-2">{c.tamanhos.join(", ") || "—"}</td>
                    <td className="px-3 py-2 tabular">{numero(c.pedidos)}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular">{moeda(c.gasto)}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular">{c.ultima_compra ? data(c.ultima_compra) : "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{[...new Set([...c.categorias_compradas, ...c.categorias_interesse])].join(", ") || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {c.consentimento_contato ? (
                        <span className="flex items-center gap-2">
                          <Badge tom={c.em_descanso ? "atencao" : "ok"}>{c.em_descanso ? "Em descanso" : "Autorizou"}</Badge>
                          <button type="button" className="text-xs text-muted-foreground hover:text-erro-tx" onClick={() => sair.mutate(c.id)}>sair</button>
                        </span>
                      ) : (
                        <Badge tom="bloqueado">Sem contato</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!!lista.data?.length && (
          <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
            {lista.data.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violeta-50 text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100">
                      <UserRound className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.nome || "Sem nome"}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{c.ref}</p>
                    </div>
                  </div>
                  {c.consentimento_contato ? (
                    <Badge tom="ok"><ShieldCheck aria-hidden /> Autorizou</Badge>
                  ) : (
                    <Badge tom="bloqueado"><ShieldOff aria-hidden /> Sem contato</Badge>
                  )}
                </div>
                <p className="text-[13px] text-muted-foreground">
                  {[c.faixa_rotulo && `${c.faixa_rotulo} anos`, c.tamanhos.length ? `veste ${c.tamanhos.join(", ")}` : null, c.whatsapp && zap(c.whatsapp)].filter(Boolean).join(" · ") || "Sem dados preenchidos"}
                </p>
                <p className="text-[13px]">
                  {c.pedidos ? (
                    <>
                      <strong className="tabular">{numero(c.pedidos)}</strong> pedidos · {moeda(c.gasto)} · última {c.ultima_compra ? data(c.ultima_compra) : "—"}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Sem compras identificadas</span>
                  )}
                </p>
                {(c.categorias_compradas.length > 0 || c.categorias_interesse.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {[...new Set([...c.categorias_compradas, ...c.categorias_interesse])].map((k) => (
                      <span key={k} className="rounded-sm border border-border bg-muted px-2 py-0.5 text-[11px]">{k}</span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">{c.em_descanso ? "Contatado há pouco (descanso de 14 dias)" : ""}</span>
                  {c.consentimento_contato && (
                    <button type="button" className="font-medium text-muted-foreground hover:text-erro-tx" onClick={() => sair.mutate(c.id)}>
                      Pediu para sair
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {pag.data && pag.data.paginas > 1 && (
          <nav aria-label="Páginas de clientes" className="mt-4 flex items-center justify-between gap-2 text-sm">
            <Button
              variant="secondary"
              className="h-11"
              disabled={pag.data.pagina <= 1}
              onClick={() => set("pagina", String(pag.data!.pagina - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft aria-hidden /> Anterior
            </Button>
            <span className="tabular text-muted-foreground">
              Página {pag.data.pagina} de {pag.data.paginas}
            </span>
            <Button
              variant="secondary"
              className="h-11"
              disabled={pag.data.pagina >= pag.data.paginas}
              onClick={() => set("pagina", String(pag.data!.pagina + 1))}
              aria-label="Próxima página"
            >
              Próxima <ChevronRight aria-hidden />
            </Button>
          </nav>
        )}
      </section>

      <LimitationNote className="mt-6" texto="Dado pessoal só com finalidade de atendimento e consentimento registrado (LGPD). Relatórios e o motor usam apenas o código do cliente." />
      <NovoClienteDialog aberto={novo} onClose={() => setNovo(false)} />
    </>
  );
}

const schema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  whatsapp: z.string().trim().refine((v) => v === "" || v.replace(/\D/g, "").length >= 10, "DDD + número"),
  faixa_etaria: z.string(),
  tamanhos: z.string(),
  categorias: z.string(),
  consentimento_contato: z.boolean(),
});
type Form = z.infer<typeof schema>;

function NovoClienteDialog({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const form = useForm<Form>({ resolver: zodResolver(schema) });
  useEffect(() => {
    if (aberto) form.reset({ nome: "", whatsapp: "", faixa_etaria: "", tamanhos: "", categorias: "", consentimento_contato: false });
  }, [aberto, form]);
  const criar = useMutation({
    mutationFn: (f: Form) =>
      api<Cliente>("/api/clientes/", {
        method: "POST",
        body: json({
          nome: f.nome,
          whatsapp: f.whatsapp,
          faixa_etaria: f.faixa_etaria || null,
          tamanhos: f.tamanhos.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean),
          categorias_interesse: f.categorias.split(",").map((x) => x.trim()).filter(Boolean),
          consentimento_contato: f.consentimento_contato,
        }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente cadastrado.");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const e = form.formState.errors;
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Pergunte se o cliente autoriza receber mensagens.</DialogDescription>
        </DialogHeader>
        <form id="form-cli" className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((f) => criar.mutate(f))} noValidate>
          <Field label="Nome" htmlFor="cn" erro={e.nome?.message} className="sm:col-span-2"><Input id="cn" autoFocus {...form.register("nome")} /></Field>
          <Field label="WhatsApp" htmlFor="cw" erro={e.whatsapp?.message}><Input id="cw" inputMode="tel" placeholder="(63) 99999-0000" {...form.register("whatsapp")} /></Field>
          <Field label="Faixa etária" htmlFor="cf">
            <Select id="cf" {...form.register("faixa_etaria")}>
              <option value="">Não informada</option>
              {FAIXAS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
            </Select>
          </Field>
          <Field label="Tamanhos" htmlFor="ct" ajuda="Separados por vírgula"><Input id="ct" placeholder="M, 42" {...form.register("tamanhos")} /></Field>
          <Field label="Interesses" htmlFor="ci" ajuda="Categorias, separadas por vírgula"><Input id="ci" placeholder="Calças, Camisas" {...form.register("categorias")} /></Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="size-5 accent-violeta-500" {...form.register("consentimento_contato")} />
            O cliente autorizou receber mensagens no WhatsApp
          </label>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-cli" carregando={criar.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
