// Inspirado em React Bits "ClickSpark" (MIT + Commons Clause). Canvas leve, cor por token,
// aria-hidden e sem efeito com reduced motion. Confirmação tátil de "gravou".
import { useCallback, useEffect, useRef } from "react";
import { useMenosMovimento } from "@/lib/movimento";

type Faisca = { x: number; y: number; ang: number; t0: number };

export function ClickSpark({
  children,
  cor = "var(--color-violeta-500)",
  qtd = 8,
  raio = 18,
  duracao = 380,
}: {
  children: React.ReactNode;
  cor?: string;
  qtd?: number;
  raio?: number;
  duracao?: number;
}) {
  const menos = useMenosMovimento();
  const wrap = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const faiscas = useRef<Faisca[]>([]);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const desenhar = useCallback(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const agora = performance.now();
    ctx.clearRect(0, 0, c.width, c.height);
    const corReal = getComputedStyle(c).color;
    faiscas.current = faiscas.current.filter((f) => agora - f.t0 < duracao);
    for (const f of faiscas.current) {
      const p = (agora - f.t0) / duracao;
      const e = 1 - Math.pow(1 - p, 3);
      const d = e * raio;
      const len = (1 - e) * 8;
      ctx.strokeStyle = corReal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(f.x + d * Math.cos(f.ang), f.y + d * Math.sin(f.ang));
      ctx.lineTo(f.x + (d + len) * Math.cos(f.ang), f.y + (d + len) * Math.sin(f.ang));
      ctx.stroke();
    }
    if (faiscas.current.length) raf.current = requestAnimationFrame(desenhar);
  }, [duracao, raio]);

  const clicar = (e: React.MouseEvent) => {
    if (menos || !wrap.current || !canvas.current) return;
    const r = wrap.current.getBoundingClientRect();
    canvas.current.width = r.width + raio * 4;
    canvas.current.height = r.height + raio * 4;
    const x = e.clientX - r.left + raio * 2;
    const y = e.clientY - r.top + raio * 2;
    const t0 = performance.now();
    faiscas.current = Array.from({ length: qtd }, (_, i) => ({ x, y, ang: (2 * Math.PI * i) / qtd, t0 }));
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(desenhar);
  };

  return (
    <span ref={wrap} onClickCapture={clicar} className="relative inline-flex w-full">
      {children}
      <canvas
        ref={canvas}
        aria-hidden
        className="pointer-events-none absolute"
        style={{ inset: -raio * 2, color: cor }}
      />
    </span>
  );
}
