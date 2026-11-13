// Inspirado em React Bits "SpotlightCard" (MIT + Commons Clause). Reimplementação enxuta:
// tokens Mídia UI, cantos retos, sem hex, desligado no toque e com reduced motion.
import { useRef } from "react";
import { useMenosMovimento, useToque } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  className,
  children,
  cor = "var(--color-violeta-500)",
  intensidade = 12,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { cor?: string; intensidade?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const desligado = useMenosMovimento() || useToque();

  const mover = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || desligado) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--sx", `${e.clientX - r.left}px`);
    el.style.setProperty("--sy", `${e.clientY - r.top}px`);
    el.style.setProperty("--so", "1");
  };

  return (
    <div
      ref={ref}
      onMouseMove={mover}
      onMouseLeave={() => ref.current?.style.setProperty("--so", "0")}
      className={cn("relative isolate overflow-hidden", className)}
      {...props}
    >
      {!desligado && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-200"
          style={{
            opacity: "var(--so, 0)",
            background: `radial-gradient(260px circle at var(--sx, 50%) var(--sy, 50%), color-mix(in oklab, ${cor} ${intensidade}%, transparent), transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
}
