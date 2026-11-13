// Inspirado em React Bits "RotatingText" (MIT + Commons Clause): CSS puro, sem biblioteca de animação.
// Frases empilhadas no mesmo lugar (grid), cada uma visível por ~3 s em ciclo de 16 s.
// `classeItem` vai em cada frase: efeitos de texto como gradiente (background-clip: text) precisam ficar
// no elemento que anima, senão o Chrome pode não desenhar o texto.
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function RotatingText({
  frases,
  className,
  classeItem,
}: {
  frases: readonly [string, string, string, string];
  className?: string;
  classeItem?: string;
}) {
  const menos = useMenosMovimento();
  return (
    <span className={cn("efeito-texto-rotativo", className)}>
      {(menos ? frases.slice(0, 1) : frases).map((frase, i) => (
        <span
          key={frase}
          aria-hidden={i !== 0}
          className={cn(!menos && "efeito-texto-rotativo-item", classeItem)}
          style={menos ? undefined : { animationDelay: `${i * 4}s` }}
        >
          {frase}
        </span>
      ))}
    </span>
  );
}
