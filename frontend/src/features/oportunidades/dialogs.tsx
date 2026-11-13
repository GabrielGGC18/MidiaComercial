import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Lightbulb, Upload } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { api, json, mensagemErro } from "@/api/client";
import type { Oportunidade, Painel, Plano } from "@/api/types";
import { EvidenceList, ProximoPasso } from "@/components/midia/oportunidade";
import { LimitationNote, rotuloFonte, SignalBadge } from "@/components/midia/sinais";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { isoDaqui, isoHoje } from "@/lib/format";
import { rotuloRegra } from "@/lib/termos";

type Chave = readonly unknown[];

const acaoSchema = z.object({
  responsavel: z.string().trim().min(1, "Quem vai cuidar disso?").max(80),
  prazo: z.string().refine((v) => v >= isoHoje(), "O prazo não pode estar no passado"),
  indicador: z.string().trim().min(3, "Como vamos medir?").max(200),
});
type AcaoForm = z.infer<typeof acaoSchema>;

export function CriarAcaoDialog({
  oportunidade,
  onClose,
  chavePainel,
}: {
  oportunidade: Oportunidade | null;
  onClose: () => void;
  chavePainel: Chave;
}) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const form = useForm<AcaoForm>({ resolver: zodResolver(acaoSchema) });

  useEffect(() => {
    if (oportunidade)
      form.reset({ responsavel: "", prazo: isoDaqui(7), indicador: oportunidade.medicao_sugerida });
  }, [oportunidade, form]);

  const criar = useMutation({
    mutationFn: (f: AcaoForm) =>
      api<Plano>("/api/acoes/", { method: "POST", body: json({ ...f, oportunidade_id: oportunidade?.id }) }),
    onSuccess: (plano) => {
      qc.setQueryData<Painel>(chavePainel, (p) =>
        p && { ...p, cartoes: p.cartoes.map((c) => (c.id === oportunidade?.id ? { ...c, plano_id: plano.id } : c)) },
      );
      void qc.invalidateQueries({ queryKey: ["acoes"] });
      toast.success("Ação criada.", { action: { label: "Ver plano", onClick: () => nav(`/acoes/${plano.id}`) } });
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  return (
    <Dialog open={!!oportunidade} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar ação</DialogTitle>
          <DialogDescription>{oportunidade?.titulo}</DialogDescription>
        </DialogHeader>
        <form id="form-acao" onSubmit={form.handleSubmit((f) => criar.mutate(f))} className="flex flex-col gap-4" noValidate>
          <Field label="Responsável" htmlFor="resp" erro={form.formState.errors.responsavel?.message}>
            <Input id="resp" placeholder="Ex.: Ana" autoFocus {...form.register("responsavel")} />
          </Field>
          <Field label="Prazo" htmlFor="prazo" erro={form.formState.errors.prazo?.message}>
            <Input id="prazo" type="date" min={isoHoje()} {...form.register("prazo")} />
          </Field>
          <Field label="Indicador" htmlFor="ind" erro={form.formState.errors.indicador?.message} ajuda="Como saberemos se a ação ajudou.">
            <Textarea id="ind" rows={2} className="min-h-0" {...form.register("indicador")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="form-acao" carregando={criar.isPending}>Criar ação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const descarteSchema = z.object({ justificativa: z.string().trim().min(3, "Conte em poucas palavras o porquê").max(500) });

export function DescartarDialog({
  oportunidade,
  onClose,
  chavePainel,
}: {
  oportunidade: Oportunidade | null;
  onClose: () => void;
  chavePainel: Chave;
}) {
  const qc = useQueryClient();
  const form = useForm<{ justificativa: string }>({ resolver: zodResolver(descarteSchema) });
  useEffect(() => form.reset({ justificativa: "" }), [oportunidade, form]);

  const descartar = useMutation({
    mutationFn: (f: { justificativa: string }) =>
      api(`/api/oportunidades/${oportunidade?.id}/descartar`, { method: "POST", body: json(f) }),
    onSuccess: () => {
      qc.setQueryData<Painel>(chavePainel, (p) => p && { ...p, cartoes: p.cartoes.filter((c) => c.id !== oportunidade?.id) });
      toast.success("Oportunidade descartada. Ela não volta nos próximos 7 dias.");
      onClose();
    },
    onError: (e) => toast.error(mensagemErro(e)),
  });

  return (
    <Dialog open={!!oportunidade} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar oportunidade</DialogTitle>
          <DialogDescription>{oportunidade?.titulo}</DialogDescription>
        </DialogHeader>
        <form id="form-descarte" onSubmit={form.handleSubmit((f) => descartar.mutate(f))} noValidate>
          <Field label="Por que descartar?" htmlFor="just" erro={form.formState.errors.justificativa?.message}>
            <Textarea id="just" placeholder="Ex.: fornecedor parou de fabricar" autoFocus {...form.register("justificativa")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Voltar</Button>
          <Button variant="danger" type="submit" form="form-descarte" carregando={descartar.isPending}>Descartar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetalheDialog({
  oportunidade: o,
  onClose,
  onCriarAcao,
}: {
  oportunidade: Oportunidade | null;
  onClose: () => void;
  onCriarAcao: (o: Oportunidade) => void;
}) {
  return (
    <Dialog open={!!o} onOpenChange={(v) => !v && onClose()}>
      <DialogContent lado="direita" className="flex flex-col gap-5">
        {o && (
          <>
            <DialogHeader className="mb-0">
              <p className="sobretitulo text-muted-foreground">{rotuloRegra(o.regra_nome)}</p>
              <DialogTitle className="text-h2">{o.titulo}</DialogTitle>
              <div><SignalBadge status={o.status} /></div>
            </DialogHeader>

            {/* Ordem de decisão (UX-07): o que fazer → por quê → limitação → ações → detalhes */}
            <ProximoPasso texto={o.acao_sugerida} />

            <section>
              <p className="sobretitulo mb-2 flex items-center gap-1.5 text-muted-foreground">
                <Lightbulb className="size-3.5" aria-hidden /> Por que estamos sugerindo isso
              </p>
              {/* Texto gerado antes do "Recalcular" ainda traz passo e limitação colados: corta para não repetir */}
              <p className="mb-3 text-sm leading-relaxed">{o.explicacao.split(" Próximo passo:")[0]}</p>
              <EvidenceList evidencias={o.evidencias} />
            </section>

            <LimitationNote texto={o.limitacao} />

            <div className="flex flex-col gap-2 sm:flex-row">
              {!o.plano_id && (
                <Button className="flex-1" onClick={() => onCriarAcao(o)}>Criar ação</Button>
              )}
              {o.evidencias.some((e) => e.fonte === "estoque") && (
                <Link to="/importar" className={buttonVariants({ variant: "secondary", className: "flex-1" })}>
                  <Upload aria-hidden /> Estoque mudou? Atualizar
                </Link>
              )}
            </div>

            <details className="group rounded-md border border-border text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2.5 font-medium text-muted-foreground hover:text-foreground">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden /> Ver detalhes
              </summary>
              <div className="flex flex-col gap-3 border-t border-border p-3">
                <div>
                  <p className="sobretitulo mb-1 text-muted-foreground">Como vamos medir</p>
                  <p>{o.medicao_sugerida || "—"}</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">De onde veio</dt>
                    <dd className="font-medium">{[...new Set(o.evidencias.map((e) => rotuloFonte(e.fonte)))].join(", ")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Ordem na lista</dt>
                    <dd className="font-medium">{o.prioridade}º</dd>
                  </div>
                  {typeof o.alvo.sku === "string" && (
                    <div>
                      <dt className="text-muted-foreground">Código do produto</dt>
                      <dd className="font-mono font-medium">{o.alvo.sku}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted-foreground">Regra (técnico)</dt>
                    <dd className="font-mono font-medium">{o.regra} · v{o.versao_regra}</dd>
                  </div>
                </dl>
              </div>
            </details>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
