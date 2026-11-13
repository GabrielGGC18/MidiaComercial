// Inspirado em React Bits "BlurText" (MIT + Commons Clause). CSS puro (sem motion) para
// não pesar o bundle inicial do login. Palavras entram desfocadas em sequência.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function BlurText({ texto, className, atraso = 90 }: { texto: string; className?: string; atraso?: number }) {
  const menos = useMenosMovimento();
  return (
    <span className={className} aria-label={texto}>
      {texto.split(" ").map((p, i) => (
        <span
          key={i}
          aria-hidden
          className={cn("inline-block", !menos && "efeito-desfoque")}
          style={menos ? undefined : { animationDelay: `${i * atraso}ms` }}
        >
          {p}&nbsp;
        </span>
      ))}
    </span>
  );
}
