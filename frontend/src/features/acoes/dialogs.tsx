import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { api, json, mensagemErro } from "@/api/client";
import type { Plano, SugestaoMedicao } from "@/api/types";
import { AvisoAssociacao } from "@/components/midia/acao";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { isoDaqui, isoHoje } from "@/lib/format";

function useAtualizarCache() {
  const qc = useQueryClient();
  return (p: Plano) => {
    qc.setQueriesData<Plano>({ queryKey: ["acoes", "detalhe", p.id] }, () => p);
    void qc.invalidateQueries({ queryKey: ["acoes"] });
    void qc.invalidateQueries({ queryKey: ["oportunidades"] });
  };
}

const paraNumero = (v: string) => Number(v.replace(",", "."));
const numeroValido = (v: string) => !Number.isNaN(paraNumero(v)) && paraNumero(v) >= 0;

const medSchema = z
  .object({
    periodo_antes_inicio: z.string().min(1, "Obrigatório"),
    periodo_antes_fim: z.string().min(1, "Obrigatório"),
    periodo_depois_inicio: z.string().min(1, "Obrigatório"),
    periodo_depois_fim: z.string().min(1, "Obrigatório"),
    valor_antes: z.string().trim().min(1, "Informe um número").refine(numeroValido, "Use um número ≥ 0 (ex.: 9 ou 12,5)"),
    valor_depois: z.string().trim().refine((v) => v === "" || numeroValido(v), "Use um número ≥ 0 ou deixe vazio"),
    contexto: z.string().max(1000).optional(),
  })
  .refine((v) => v.periodo_antes_inicio <= v.periodo_antes_fim, { path: ["periodo_antes_fim"], message: "Fim antes do início" })
  .refine((v) => v.periodo_depois_inicio <= v.periodo_depois_fim, { path: ["periodo_depois_fim"], message: "Fim antes do início" });
type MedForm = z.infer<typeof medSchema>;

export function MedicaoDialog({ plano, aberto, onClose }: { plano: Plano; aberto: boolean; onClose: () => void }) {
  const atualizar = useAtualizarCache();
  const sugestao = useQuery({
    queryKey: ["acoes", "sugestao", plano.id],
    queryFn: () => api<SugestaoMedicao | undefined>(`/api/acoes/${plano.id}/medicao-sugerida`),
    enabled: aberto,
  });
  const form = useForm<MedForm>({ resolver: zodResolver(medSchema) });

  useEffect(() => {
    if (!aberto) return;
    const s = sugestao.data;
    form.reset(
      s
        ? {
            periodo_antes_inicio: s.periodo_antes_inicio, periodo_antes_fim: s.periodo_antes_fim,
            periodo_depois_inicio: s.periodo_depois_inicio, periodo_depois_fim: s.periodo_depois_fim,
            valor_antes: String(Number(s.valor_antes)), valor_depois: String(Number(s.valor_depois)), contexto: "",
          }
        : {
            periodo_antes_inicio: isoDaqui(-14), periodo_antes_fim: isoDaqui(-8),
            periodo_depois_inicio: isoDaqui(-7), periodo_depois_fim: isoHoje(),
            valor_antes: "", valor_depois: "", contexto: "",
          },
    );
  }, [aberto, sugestao.data, form]);

  const salvar = useMutation({
    mutationFn: (f: MedForm) =>
      api<Plano>(`/api/acoes/${plano.id}/medicoes`, {
        method: "POST",
        body: json({
          ...f,
          valor_antes: paraNumero(f.valor_antes),
          valor_depois: f.valor_depois === "" ? null : paraNumero(f.valor_depois),
        }),
      }),
    onSuccess: (p) => {
      atualizar(p);
      toast.success("Medição registrada.");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  const err = form.formState.errors;
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar medição</DialogTitle>
          <DialogDescription>{plano.indicador}</DialogDescription>
        </DialogHeader>
        {sugestao.data && (
          <p className="mb-4 flex items-start gap-2 rounded-md bg-violeta-50 px-3 py-2 text-[13px] text-violeta-700 dark:bg-violeta-900/30 dark:text-violeta-100">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            Valores calculados a partir dos dados ({sugestao.data.unidade}).{" "}
            {!sugestao.data.periodo_depois_completo && "O período “depois” ainda não terminou."} Ajuste se precisar.
          </p>
        )}
        <form id="form-med" className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((f) => salvar.mutate(f))} noValidate>
          <fieldset className="grid gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-[13px] font-semibold">Antes</legend>
            <div className="grid grid-cols-2 gap-2">
              <Field label="De" htmlFor="ai" erro={err.periodo_antes_inicio?.message}><Input id="ai" type="date" {...form.register("periodo_antes_inicio")} /></Field>
              <Field label="Até" htmlFor="af" erro={err.periodo_antes_fim?.message}><Input id="af" type="date" {...form.register("periodo_antes_fim")} /></Field>
            </div>
            <Field label="Valor" htmlFor="va" erro={err.valor_antes?.message}><Input id="va" inputMode="decimal" {...form.register("valor_antes")} /></Field>
          </fieldset>
          <fieldset className="grid gap-3 rounded-md border border-border p-3">
            <legend className="px-1 text-[13px] font-semibold">Depois</legend>
            <div className="grid grid-cols-2 gap-2">
              <Field label="De" htmlFor="di" erro={err.periodo_depois_inicio?.message}><Input id="di" type="date" {...form.register("periodo_depois_inicio")} /></Field>
              <Field label="Até" htmlFor="df" erro={err.periodo_depois_fim?.message}><Input id="df" type="date" {...form.register("periodo_depois_fim")} /></Field>
            </div>
            <Field label="Valor" htmlFor="vd" erro={err.valor_depois?.message} ajuda="Deixe vazio se ainda não dá para medir."><Input id="vd" inputMode="decimal" {...form.register("valor_depois")} /></Field>
          </fieldset>
          <Field label="Contexto (opcional)" htmlFor="ctx" className="sm:col-span-2" ajuda="Ex.: feriado, promoção, chuva forte.">
            <Textarea id="ctx" rows={2} className="min-h-0" {...form.register("contexto")} />
          </Field>
        </form>
        <AvisoAssociacao className="mt-4" />
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-med" carregando={salvar.isPending}>Salvar medição</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MudarSituacaoDialog({
  plano,
  situacao,
  onClose,
}: {
  plano: Plano;
  situacao: "concluida" | "descartada" | null;
  onClose: () => void;
}) {
  const atualizar = useAtualizarCache();
  const exige = situacao === "descartada";
  const form = useForm<{ justificativa: string }>({
    resolver: zodResolver(
      z.object({ justificativa: exige ? z.string().trim().min(3, "Explique o motivo do descarte") : z.string() }),
    ),
  });
  useEffect(() => form.reset({ justificativa: "" }), [situacao, form]);

  const salvar = useMutation({
    mutationFn: (f: { justificativa: string }) =>
      api<Plano>(`/api/acoes/${plano.id}`, { method: "PATCH", body: json({ situacao, justificativa: f.justificativa }) }),
    onSuccess: (p) => {
      atualizar(p);
      toast.success(situacao === "concluida" ? "Ação concluída." : "Ação descartada.");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  return (
    <Dialog open={!!situacao} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{situacao === "concluida" ? "Concluir ação" : "Descartar ação"}</DialogTitle>
          <DialogDescription>{plano.titulo}</DialogDescription>
        </DialogHeader>
        <form id="form-sit" onSubmit={form.handleSubmit((f) => salvar.mutate(f))} noValidate>
          <Field label={exige ? "Por que descartar?" : "Observação (opcional)"} htmlFor="js" erro={form.formState.errors.justificativa?.message}>
            <Textarea id="js" autoFocus {...form.register("justificativa")} />
          </Field>
        </form>
        {situacao === "concluida" && plano.medicoes.length === 0 && (
          <p className="mt-3 text-[13px] text-sinal-atencao-tx dark:text-sinal-atencao">Dica: registre uma medição antes de concluir.</p>
        )}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button type="submit" form="form-sit" variant={exige ? "danger" : "primary"} carregando={salvar.isPending}>
            {situacao === "concluida" ? "Concluir" : "Descartar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const novaSchema = z.object({
  titulo: z.string().trim().min(3, "Dê um título à ação").max(200),
  responsavel: z.string().trim().min(1, "Quem vai cuidar disso?").max(80),
  prazo: z.string().refine((v) => v >= isoHoje(), "O prazo não pode estar no passado"),
  indicador: z.string().trim().min(3, "Como vamos medir?").max(200),
});
type NovaForm = z.infer<typeof novaSchema>;

export function NovaAcaoDialog({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const atualizar = useAtualizarCache();
  const form = useForm<NovaForm>({ resolver: zodResolver(novaSchema) });
  useEffect(() => {
    if (aberto) form.reset({ titulo: "", responsavel: "", prazo: isoDaqui(7), indicador: "" });
  }, [aberto, form]);
  const criar = useMutation({
    mutationFn: (f: NovaForm) => api<Plano>("/api/acoes/", { method: "POST", body: json(f) }),
    onSuccess: (p) => {
      atualizar(p);
      toast.success("Ação criada.");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });
  const e = form.formState.errors;
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova ação</DialogTitle>
          <DialogDescription>Uma ação que não veio de uma oportunidade.</DialogDescription>
        </DialogHeader>
        <form id="form-nova" className="flex flex-col gap-4" onSubmit={form.handleSubmit((f) => criar.mutate(f))} noValidate>
          <Field label="Título" htmlFor="nt" erro={e.titulo?.message}><Input id="nt" autoFocus {...form.register("titulo")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Responsável" htmlFor="nr" erro={e.responsavel?.message}><Input id="nr" {...form.register("responsavel")} /></Field>
            <Field label="Prazo" htmlFor="np" erro={e.prazo?.message}><Input id="np" type="date" min={isoHoje()} {...form.register("prazo")} /></Field>
          </div>
          <Field label="Indicador" htmlFor="ni" erro={e.indicador?.message}><Input id="ni" {...form.register("indicador")} /></Field>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-nova" carregando={criar.isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
