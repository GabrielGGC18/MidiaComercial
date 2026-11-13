// Inspirado em React Bits "CountUp" (MIT + Commons Clause). Reimplementação sem dependência:
// requestAnimationFrame + IntersectionObserver; anima de onde estava até o novo valor.
import { useEffect, useRef, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";

export function CountUp({
  para,
  formatar = (v) => String(Math.round(v)),
  duracao = 700,
  className,
}: {
  para: number;
  formatar?: (v: number) => string;
  duracao?: number;
  className?: string;
}) {
  const menos = useMenosMovimento();
  const [valor, setValor] = useState(menos ? para : 0);
  const de = useRef(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (menos) return setValor(para);
    let raf = 0;
    const animar = () => {
      const ini = de.current;
      const t0 = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - t0) / duracao);
        const v = ini + (para - ini) * (1 - Math.pow(1 - p, 3));
        setValor(v);
        if (p < 1) raf = requestAnimationFrame(passo);
        else de.current = para;
      };
      raf = requestAnimationFrame(passo);
    };
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      animar();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        animar();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [para, duracao, menos]);

  return (
    <span ref={ref} className={className}>
      {formatar(valor)}
    </span>
  );
}
