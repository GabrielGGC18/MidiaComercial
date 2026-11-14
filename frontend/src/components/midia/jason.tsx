// Easter egg do rodapé: um botão discreto "13" chama o Jason (Sexta-feira 13).
// A máscara é um desenho próprio (SVG), sem imagem de terceiros. Some sozinha em 3 s ou com Esc/clique.
// Com "menos movimento", aparece sem animação (regra global do tokens.css).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function MascaraHoquei({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <path d="M60 4C28 4 10 30 10 66c0 38 20 76 50 80 30-4 50-42 50-80C110 30 92 4 60 4Z" fill="#f4f1e8" stroke="#1b1b1b" strokeWidth="3" />
      {/* marcas vermelhas da máscara */}
      <path d="M40 22l12 10M80 22L68 32M30 40l10 4M90 40l-10 4" stroke="#d62828" strokeWidth="5" strokeLinecap="round" />
      {/* olhos */}
      <ellipse cx="40" cy="62" rx="12" ry="9" fill="#111" />
      <ellipse cx="80" cy="62" rx="12" ry="9" fill="#111" />
      {/* furos de respiração */}
      {[
        [48, 92], [60, 90], [72, 92], [42, 106], [54, 104], [66, 104], [78, 106], [48, 120], [60, 118], [72, 120], [60, 134],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3.2" fill="#111" />
      ))}
      <path d="M18 78h8M94 78h8" stroke="#1b1b1b" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function EasterEggJason() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const t = window.setTimeout(() => setAberto(false), 3000);
    const sair = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", sair);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", sair);
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Sexta-feira 13"
        title="Sexta-feira 13"
        className="grid size-9 place-items-center rounded-full border border-white/10 font-display text-xs font-bold text-tinta-300 transition-colors hover:border-coral-500/60 hover:text-coral-500"
      >
        13
      </button>
      {aberto &&
        createPortal(
          <div className="fixed inset-0 z-aviso grid place-items-center bg-black/70 backdrop-blur-sm" role="status" aria-live="polite" onClick={() => setAberto(false)}>
            <div className="jason-surge flex flex-col items-center text-center">
              <MascaraHoquei className="h-48 w-auto drop-shadow-[0_20px_40px_rgb(214_40_40/0.45)] sm:h-64" />
              <p className="mt-5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Ki ki ki… ma ma ma…</p>
              <p className="mt-1 text-sm text-tinta-300">Hoje é sexta-feira 13. Nenhuma venda perdida fica no escuro.</p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
