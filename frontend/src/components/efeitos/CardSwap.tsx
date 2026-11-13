// Inspirado em React Bits "CardSwap" (MIT + Commons Clause). Sem gsap: transições CSS + timer.
// Pilha de cards em perspectiva; a cada `intervalo` o card da frente cai e volta para o fundo.
// Pausa com o mouse em cima e com a aba oculta. Com movimento reduzido, fica parado (troca só no clique).
import { Children, useEffect, useRef, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function CardSwap({
  children,
  intervalo = 4200,
  deslocX = 34,
  deslocY = 30,
  className,
  onTroca,
}: {
  children: React.ReactNode;
  intervalo?: number;
  deslocX?: number;
  deslocY?: number;
  className?: string;
  onTroca?: (frente: number) => void;
}) {
  const itens = Children.toArray(children);
  const n = itens.length;
  const menos = useMenosMovimento();
  const [ordem, setOrdem] = useState(() => itens.map((_, i) => i));
  const [saindo, setSaindo] = useState<number | null>(null);
  const pausado = useRef(false);

  const avancar = () => {
    if (saindo !== null || n < 2) return;
    setSaindo(ordem[0]);
    window.setTimeout(
      () => {
        setOrdem((o) => [...o.slice(1), o[0]]);
        setSaindo(null);
      },
      menos ? 0 : 480,
    );
  };

  const frente = ordem[0];
  useEffect(() => {
    onTroca?.(frente);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frente]);

  useEffect(() => {
    if (menos || n < 2) return;
    const t = window.setInterval(() => {
      if (!pausado.current && document.visibilityState === "visible") avancar();
    }, intervalo);
    return () => window.clearInterval(t);
  });

  return (
    <div
      className={cn("relative [perspective:1200px]", className)}
      onMouseEnter={() => (pausado.current = true)}
      onMouseLeave={() => (pausado.current = false)}
    >
      {itens.map((item, i) => {
        const pos = ordem.indexOf(i);
        const caindo = saindo === i;
        const transform = caindo
          ? `translate3d(0, 115%, 0) rotateX(8deg)`
          : `translate3d(${pos * deslocX}px, ${-pos * deslocY}px, ${-pos * 70}px) skewY(${pos ? -3 : 0}deg)`;
        return (
          <div
            key={i}
            className={cn(
              "absolute inset-0 [transform-style:preserve-3d]",
              !menos && "transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.3,0.7,0.2,1)]",
              pos === 0 ? "cursor-pointer" : "pointer-events-none",
            )}
            style={{
              transform,
              zIndex: caindo ? n + 1 : n - pos,
              opacity: caindo ? 0 : pos > 3 ? 0 : 1,
              filter: pos ? `brightness(${1 - pos * 0.12})` : undefined,
            }}
            aria-hidden={pos !== 0}
            onClick={pos === 0 ? avancar : undefined}
          >
            {item}
          </div>
        );
      })}
    </div>
  );
}
