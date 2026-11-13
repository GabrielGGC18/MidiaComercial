// Inspirado em React Bits "FadeContent" (MIT + Commons Clause). Sem gsap: IntersectionObserver +
// CSS. Entra ao rolar, só na primeira vez.
import { useEffect, useRef, useState } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function FadeContent({ children, className, atraso = 0 }: { children: React.ReactNode; className?: string; atraso?: number }) {
  const menos = useMenosMovimento();
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(menos);

  useEffect(() => {
    if (menos || !ref.current || !("IntersectionObserver" in window)) return setVisivel(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [menos]);

  return (
    <div
      ref={ref}
      className={cn("transition-[opacity,transform] duration-300 ease-out", visivel ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0", className)}
      style={{ transitionDelay: visivel ? `${atraso}ms` : undefined }}
    >
      {children}
    </div>
  );
}
