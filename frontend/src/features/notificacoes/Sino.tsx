// Interface do padrão Observer: sino + toast para avisos novos (consulta a cada 30 s).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, CircleAlert, Info, PartyPopper, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useChaveLoja } from "@/api/sessao";
import { relativo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Notificacao {
  id: number;
  tipo: string;
  nivel: "info" | "atencao" | "sucesso" | "erro";
  titulo: string;
  texto: string;
  link: string;
  contador: number;
  lida: boolean;
  atualizada_em: string;
}

const ICONE = { info: Info, atencao: TriangleAlert, sucesso: PartyPopper, erro: CircleAlert } as const;
const COR = {
  info: "text-info-tx dark:text-info",
  atencao: "text-sinal-atencao-tx dark:text-sinal-atencao",
  sucesso: "text-sinal-ok-tx dark:text-sinal-ok",
  erro: "text-erro-tx dark:text-erro",
} as const;

export default function Sino({ className, alinhar = "esquerda" }: { className?: string; alinhar?: "esquerda" | "direita" }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const chave = useChaveLoja("notificacoes");
  const vistas = useRef<Set<number> | null>(null);

  const lista = useQuery({
    queryKey: chave,
    queryFn: () => api<Notificacao[]>("/api/notificacoes/"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // toast só para o que chegou DEPOIS de abrir a tela (não para o histórico)
  useEffect(() => {
    if (!lista.data) return;
    const ids = new Set(lista.data.map((n) => n.id + n.contador * 1e6));
    if (vistas.current) {
      for (const n of lista.data) {
        if (!n.lida && !vistas.current.has(n.id + n.contador * 1e6)) {
          const fn = n.nivel === "erro" ? toast.error : n.nivel === "sucesso" ? toast.success : n.nivel === "atencao" ? toast.warning : toast.info;
          fn(n.titulo, { description: n.texto, action: n.link ? { label: "Ver", onClick: () => nav(n.link) } : undefined });
        }
      }
    }
    vistas.current = ids;
  }, [lista.data, nav]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  const ler = useMutation({
    mutationFn: (id: number) => api(`/api/notificacoes/${id}/ler`, { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chave }),
  });
  const lerTodas = useMutation({
    mutationFn: () => api("/api/notificacoes/ler-todas", { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chave }),
  });

  const naoLidas = lista.data?.filter((n) => !n.lida).length ?? 0;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : "Notificações"}
        className="relative grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        {naoLidas > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-sm bg-coral-500 px-1 text-[10px] font-bold leading-4 text-white tabular">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Notificações"
          className={cn(
            "absolute top-full z-sobre mt-2 w-[min(22rem,calc(100vw-2rem))] animate-entrar rounded-lg border border-border bg-card shadow-md",
            alinhar === "direita" ? "right-0" : "left-0",
          )}
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="sobretitulo text-muted-foreground">Avisos da loja</p>
            {naoLidas > 0 && (
              <button type="button" onClick={() => lerTodas.mutate()} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <CheckCheck className="size-3.5" aria-hidden /> Marcar todas
              </button>
            )}
          </header>
          <ul className="max-h-[60dvh] divide-y divide-border overflow-y-auto" aria-live="polite">
            {lista.data?.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum aviso por enquanto.</li>}
            {lista.data?.map((n) => {
              const Icone = ICONE[n.nivel];
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.lida) ler.mutate(n.id);
                      if (n.link) nav(n.link);
                      setAberto(false);
                    }}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-muted", !n.lida && "border-l-[3px] border-l-violeta-500 bg-violeta-50/40 dark:bg-violeta-900/20")}
                  >
                    <Icone className={cn("mt-0.5 size-4 shrink-0", COR[n.nivel])} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">
                        {n.titulo}
                        {n.contador > 1 && <span className="ml-1.5 rounded-sm bg-muted px-1 text-[11px] font-medium text-muted-foreground">×{n.contador}</span>}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted-foreground">{n.texto}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{relativo(n.atualizada_em)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
