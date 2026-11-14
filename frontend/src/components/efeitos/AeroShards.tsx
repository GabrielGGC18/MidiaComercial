// Inspirado em React Bits · Backgrounds/AeroShards (https://reactbits.dev/backgrounds/aero-shards).
// Reimplementação enxuta (docs/08 §12): o original usa WebGPU (`vgpu`, ~2.300 linhas), que não roda
// em vários navegadores e celulares. Aqui: Canvas 2D, ~110 estilhaços de vidro girando devagar,
// marcadores "+", vinheta. Pausa fora da tela e na aba oculta; com "menos movimento", um quadro fixo.
import { useEffect, useRef } from "react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

interface Estilhaco {
  raio: number; // distância do centro do redemoinho (0..1)
  angulo: number;
  vel: number;
  tam: number;
  lados: number[]; // forma irregular: raios relativos dos vértices
  giro: number;
  giroVel: number;
  camada: number; // 0 fundo … 1 frente (profundidade: tamanho, opacidade)
  acento: boolean;
}

function semente(n: number) {
  let s = n;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function criar(qtd: number): Estilhaco[] {
  const r = semente(42); // determinístico: mesma composição em toda visita
  return Array.from({ length: qtd }, () => {
    const nLados = 3 + Math.floor(r() * 3);
    return {
      raio: 0.15 + Math.pow(r(), 0.7) * 0.95,
      angulo: r() * Math.PI * 2,
      vel: (0.02 + r() * 0.05) * (r() > 0.5 ? 1 : 0.8),
      tam: 6 + r() * 26,
      lados: Array.from({ length: nLados }, () => 0.55 + r() * 0.45),
      giro: r() * Math.PI * 2,
      giroVel: (r() - 0.5) * 0.6,
      camada: r(),
      acento: r() < 0.08,
    };
  });
}

export function AeroShards({
  className,
  cor = "#6D4AFF",
  acento = "#FF6A3D",
  claro = false,
  quantidade = 110,
}: {
  className?: string;
  cor?: string;
  acento?: string;
  claro?: boolean;
  quantidade?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const menos = useMenosMovimento();

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext?.("2d");
    if (!cv || !ctx) return;
    const shards = criar(quantidade);
    let w = 0,
      h = 0,
      raf = 0,
      visivel = true,
      ultimo = 0,
      t = 0;

    const medir = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const desenhar = () => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.62,
        cy = h * 0.45,
        esc = Math.max(w, h) * 0.62;
      const alfaBase = claro ? 0.22 : 0.32;
      for (const s of shards) {
        const a = s.angulo + t * s.vel;
        // redemoinho achatado (elipse) com leve "respiração"
        const rr = s.raio * esc * (1 + Math.sin(t * 0.3 + s.giro) * 0.03);
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr * 0.55;
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;
        const prof = 0.45 + s.camada * 0.75;
        const tam = s.tam * prof;
        const g = s.giro + t * s.giroVel;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(g);
        ctx.beginPath();
        s.lados.forEach((k, i) => {
          const ang = (i / s.lados.length) * Math.PI * 2;
          const px = Math.cos(ang) * tam * k,
            py = Math.sin(ang) * tam * k * 0.6;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        const c = s.acento ? acento : cor;
        const grad = ctx.createLinearGradient(-tam, -tam, tam, tam);
        grad.addColorStop(0, c + "00");
        grad.addColorStop(0.55, c + Math.round(alfaBase * prof * 255).toString(16).padStart(2, "0"));
        grad.addColorStop(1, c + "10");
        ctx.fillStyle = grad;
        ctx.fill();
        // aresta de vidro
        ctx.strokeStyle = (claro ? "#FFFFFF" : "#E9E4FF") + Math.round((claro ? 0.5 : 0.22) * prof * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
      // marcadores "+" fixos, discretos
      ctx.strokeStyle = (claro ? "#2F3A5F" : "#B9C0D4") + "40";
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const mx = ((i * 137) % 100) / 100 * w,
          my = ((i * 61 + 17) % 100) / 100 * h;
        ctx.beginPath();
        ctx.moveTo(mx - 4, my);
        ctx.lineTo(mx + 4, my);
        ctx.moveTo(mx, my - 4);
        ctx.lineTo(mx, my + 4);
        ctx.stroke();
      }
    };

    const laco = (agora: number) => {
      raf = requestAnimationFrame(laco);
      if (!visivel || document.hidden) return;
      if (agora - ultimo < 33) return; // ~30 fps bastam para um fundo lento
      t += Math.min(0.1, (agora - (ultimo || agora)) / 1000);
      ultimo = agora;
      desenhar();
    };

    medir();
    desenhar();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => (medir(), desenhar())) : null;
    ro?.observe(cv);
    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([en]) => {
            visivel = !!en?.isIntersecting;
            ultimo = 0;
          })
        : null;
    io?.observe(cv);
    if (!menos && typeof requestAnimationFrame !== "undefined") raf = requestAnimationFrame(laco);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
    };
  }, [cor, acento, claro, quantidade, menos]);

  return (
    <div aria-hidden className={cn("pointer-events-none overflow-hidden", className)}>
      <canvas ref={ref} className="absolute inset-0 size-full" />
      {/* vinheta: o centro fica limpo para o texto e o palco */}
      <div className={cn("absolute inset-0", claro ? "bg-[radial-gradient(ellipse_at_50%_35%,transparent_25%,var(--color-background)_80%)]" : "bg-[radial-gradient(ellipse_at_50%_35%,transparent_20%,var(--color-background)_78%)]")} />
    </div>
  );
}
