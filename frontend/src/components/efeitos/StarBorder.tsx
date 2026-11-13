// Inspirado em React Bits "StarBorder" (MIT + Commons Clause). Borda com luz que percorre
// o contorno, raio de 4 px, tokens; parada com reduced motion. Só UMA ação principal por tela.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function StarBorder({
  children,
  className,
  cor = "var(--color-coral-500)",
}: {
  children: React.ReactNode;
  className?: string;
  cor?: string;
}) {
  const menos = useMenosMovimento();
  return (
    <span className={cn("relative inline-flex overflow-hidden rounded-md p-[1.5px]", className)}>
      <span
        aria-hidden
        className={cn("absolute inset-[-200%]", !menos && "efeito-giro")}
        style={{ background: `conic-gradient(from 0deg, transparent 0 70%, ${cor} 85%, transparent 100%)` }}
      />
      <span className="relative inline-flex w-full rounded-[calc(var(--radius-md)-1px)]">{children}</span>
    </span>
  );
}
