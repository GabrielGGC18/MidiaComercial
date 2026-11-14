// Movimento de entrada inspirado em pibaru.com (lá: GSAP + SplitText + ScrollTrigger).
// Aqui: IntersectionObserver liga [data-visivel] e o CSS (tokens.css, "Movimento de entrada") anima.
// Com movimento reduzido, o CSS não anima nada: tudo aparece no estado final.
import { createElement, Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** true quando o elemento entra na tela (uma vez só). */
export function useNaTela<T extends Element>(margem = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisivel(true);
      return;
    }
    const io = new IntersectionObserver(
      ([en]) => {
        if (en?.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { rootMargin: margem },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margem]);
  return [ref, visivel] as const;
}

type Modo = "escada" | "cartao" | "recorte" | "grupo" | "marca";

/** Envolve conteúdo e liga o efeito quando entra na tela. Filhos de "escada"/"grupo" usam --i. */
export function Revelar({
  modo,
  as = "div",
  className,
  style,
  children,
}: {
  modo: Modo;
  as?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [ref, visivel] = useNaTela<HTMLElement>();
  return createElement(
    as,
    {
      ref,
      className,
      style,
      "data-revelar": modo === "marca" ? undefined : modo,
      "data-visivel": visivel ? "" : undefined,
    },
    children,
  );
}

/** Título em que cada palavra sobe de dentro da própria máscara (efeito "SplitText" do Pibaru). */
export function TituloSubindo({ texto, atraso = 0, className }: { texto: string; atraso?: number; className?: string }) {
  const palavras = texto.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden>
        {palavras.map((p, i) => (
          <Fragment key={i}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <span className="sobe-palavra" style={{ animationDelay: `${atraso + i * 60}ms` }}>
                {p}
              </span>
            </span>
            {i < palavras.length - 1 && " "}
          </Fragment>
        ))}
      </span>
    </span>
  );
}

/** Ajuda para "escada"/"grupo": índice do filho como variável CSS. */
export const indice = (i: number) => ({ "--i": i }) as React.CSSProperties;

export const marcaTexto = (extra?: string) => cn("marca-texto", extra);
