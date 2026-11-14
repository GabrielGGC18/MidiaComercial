// Coreografia da página inicial com GSAP + ScrollTrigger (skills em .claude/skills/gsap-*).
// Carregado sob demanda pela HomePage: o texto aparece antes; este módulo só acrescenta movimento.
// useGSAP dá escopo e limpeza; gsap.matchMedia desliga tudo com "menos movimento".
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export default function MovimentoLanding({ alvo }: { alvo: React.RefObject<HTMLElement | null> }) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 1. Abertura: texto sobe em cascata e o palco "abre" como uma tela (inclinação 3D → plano)
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo('[data-gsap="sobe"]', { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.09 }, 0.25).fromTo(
          '[data-gsap="palco"]',
          { y: 70, rotateX: 16, scale: 0.94, autoAlpha: 0, transformPerspective: 1400, transformOrigin: "50% 0%" },
          { y: 0, rotateX: 0, scale: 1, autoAlpha: 1, duration: 1.3 },
          0.45,
        );

        // 2. Profundidade: o fundo de estilhaços anda mais devagar que a página
        gsap.to('[data-gsap="fundo"]', {
          yPercent: 18,
          ease: "none",
          scrollTrigger: { trigger: '[data-capitulo="noite"]', start: "top top", end: "bottom top", scrub: true },
        });

        // 3. Painéis empilhados: cada capítulo chega um pouco menor e "assenta" conforme rola
        gsap.utils.toArray<HTMLElement>("[data-capitulo]").forEach((cap, i) => {
          const painel = cap.firstElementChild as HTMLElement | null;
          if (!painel || i === 0) return;
          gsap.fromTo(
            painel,
            { scale: 0.955, y: 36, transformOrigin: "50% 100%" },
            { scale: 1, y: 0, ease: "none", scrollTrigger: { trigger: cap, start: "top 98%", end: "top 55%", scrub: 0.5 } },
          );
        });

        // 4. Números da faixa de fatos contam até o valor quando aparecem
        gsap.utils.toArray<HTMLElement>("[data-conta]").forEach((el) => {
          const fim = Number(el.dataset.conta ?? 0);
          if (!fim) return;
          const o = { v: 0 };
          gsap.to(o, {
            v: fim,
            duration: 1.1,
            ease: "power2.out",
            snap: { v: 1 },
            onUpdate: () => (el.textContent = String(o.v)),
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // 5. Cartões com atmosfera: o fundo desloca de leve enquanto a pessoa rola (parallax interno)
        gsap.utils.toArray<HTMLElement>(".painel-raios, .painel-estrias").forEach((el) => {
          gsap.fromTo(el, { backgroundPositionY: "0px" }, { backgroundPositionY: "-40px", ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
        });
      });
      // 6. Scroll-expand (ref. ReactBits "scroll-expand"): da tablet para cima, o palco da demonstração começa
      //    recuado e cresce até a largura toda enquanto o título recua e o painel do hero sobe mais devagar.
      //    No celular o palco já ocupa a largura; com "menos movimento", nada se mexe.
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        gsap.fromTo(
          '[data-gsap="expande"]',
          { scale: 0.86, y: 24 },
          {
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: '[data-gsap="palco"]', start: "top 95%", end: "top 22%", scrub: 0.6 },
          },
        );
        const saida = { trigger: '[data-capitulo="noite"]', start: "top top", end: "+=560", scrub: 0.5 };
        gsap.to('[data-gsap="recua"]', { yPercent: -10, autoAlpha: 0.45, ease: "none", scrollTrigger: saida });
        gsap.to('[data-gsap="painel"]', { y: -70, rotate: -1.5, ease: "none", scrollTrigger: { ...saida } });
      });
      return () => mm.revert();
    },
    { scope: alvo },
  );
  return null;
}
