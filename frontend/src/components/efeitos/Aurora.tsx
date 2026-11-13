// Inspirado em React Bits "Aurora" (MIT + Commons Clause), mas SEM WebGL (regra do docs/08):
// três manchas de gradiente radial (violeta, coral, turquesa) derivando devagar. Só tokens de cor.
// Gradiente radial em vez de filter: blur, que pesa no celular. Parado com movimento reduzido.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function Aurora({ className }: { className?: string }) {
  const menos = useMenosMovimento();
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <span className={cn("efeito-aurora efeito-aurora-1", !menos && "efeito-aurora-anima")} />
      <span className={cn("efeito-aurora efeito-aurora-2", !menos && "efeito-aurora-anima")} />
      <span className={cn("efeito-aurora efeito-aurora-3", !menos && "efeito-aurora-anima")} />
    </div>
  );
}
