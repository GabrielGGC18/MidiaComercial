// Inspirado em React Bits "ShinyText" (MIT + Commons Clause). CSS puro, tokens, reduced motion.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

/** Indica processamento ("Agente pensando…") sem spinner genérico; o texto continua legível. */
export function ShinyText({ children, className }: { children: React.ReactNode; className?: string }) {
  const menos = useMenosMovimento();
  return (
    <span
      role="status"
      className={cn("inline-block font-medium text-muted-foreground", !menos && "efeito-brilho", className)}
    >
      {children}
    </span>
  );
}
