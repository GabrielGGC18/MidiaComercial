// Inspirado em React Bits "Squares" (fundo de grade; MIT + Commons Clause). Canvas, opacidade ≤ 8%,
// velocidade baixa, pausa com a aba oculta e fica estático com reduced motion.
import { useEffect, useRef } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function Squares({
  tamanho = 36,
  velocidade = 0.15,
  className,
}: {
  tamanho?: number;
  velocidade?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const menos = useMenosMovimento();

  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    let off = 0;
    let destaque = { x: -1, y: -1, t: 0 };
    const redimensionar = () => {
      c.width = c.offsetWidth * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    };
    redimensionar();
    const desenhar = () => {
      const w = c.offsetWidth;
      const h = c.offsetHeight;
      const cor = getComputedStyle(c).color;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = cor;
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 1;
      for (let x = -tamanho + (off % tamanho); x < w; x += tamanho) {
        for (let y = -tamanho + (off % tamanho); y < h; y += tamanho) ctx.strokeRect(x + 0.5, y + 0.5, tamanho, tamanho);
      }
      // "sinal": um quadrado acende de vez em quando (violeta/coral via currentColor)
      if (performance.now() - destaque.t > 1800) {
        destaque = { x: Math.floor(Math.random() * (w / tamanho)), y: Math.floor(Math.random() * (h / tamanho)), t: performance.now() };
      }
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = cor;
      ctx.fillRect(destaque.x * tamanho + (off % tamanho), destaque.y * tamanho + (off % tamanho), tamanho, tamanho);
      ctx.globalAlpha = 1;
    };
    const loop = () => {
      if (document.visibilityState === "visible") {
        off += velocidade;
        desenhar();
      }
      raf = requestAnimationFrame(loop);
    };
    if (menos) desenhar();
    else raf = requestAnimationFrame(loop);
    window.addEventListener("resize", redimensionar);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", redimensionar);
    };
  }, [tamanho, velocidade, menos]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-violeta-500", className)}
    />
  );
}
