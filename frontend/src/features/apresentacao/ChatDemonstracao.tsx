// Conversa do roteiro. Não chama modelo nenhum: as falas vêm do cenário (cenario.ts).
import { Bot, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Fala } from "./cenario";

export function ChatDemonstracao({ falas }: { falas: Fala[] }) {
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fim.current?.parentElement;
    if (el) el.scrollTop = el.scrollHeight; // rola só a conversa, nunca a página
  }, [falas.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground">
        <Bot className="size-4 text-violeta-500" aria-hidden /> Assistente MídiaComercial
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {falas.length === 0 && (
          <p className="m-auto max-w-[24ch] text-center text-sm text-muted-foreground">
            Uma venda fictícia está pronta. Clique em “Ver uma venda acontecer”.
          </p>
        )}
        <AnimatePresence initial={false}>
          {falas.map((f, i) => (
            <motion.p
              key={f.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.26, ease: "easeOut" }}
              className={cn(
                "max-w-[92%] rounded-lg rounded-tl-sm border px-3 py-2 text-sm leading-6",
                f.tom === "atencao"
                  ? "border-sinal-atencao/40 bg-sinal-atencao-bg/60 text-sinal-atencao-tx dark:bg-sinal-atencao/10 dark:text-sinal-atencao"
                  : i === falas.length - 1
                    ? "border-violeta-500/40 bg-violeta-50 dark:bg-violeta-900/40"
                    : "border-border bg-muted/50",
              )}
            >
              {f.tom === "atencao" && <TriangleAlert className="mr-1.5 inline size-4 align-[-3px]" aria-hidden />}
              {f.texto}
            </motion.p>
          ))}
        </AnimatePresence>
        <div ref={fim} />
      </div>
    </div>
  );
}
