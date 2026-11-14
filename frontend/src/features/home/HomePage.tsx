import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { RodapeLogin, SobreNos } from "@/components/midia/institucional";
import { FilmeProduto, GradeBeneficios, ProblemaSecao, RotinaLoja } from "@/components/midia/roteiro";
import { Caminhos, Hero, PainelSecao } from "@/components/midia/vitrine";
import { PesquisaSecao } from "@/components/midia/pesquisa";
import { CabecalhoPublico } from "./CabecalhoPublico";

// Palco animado (motion + recharts) carrega depois do texto; a área fica reservada (ANIMACAO-Tela §19)
// Coreografia GSAP (ScrollTrigger): módulo separado, carrega depois do texto
const MovimentoLanding = lazy(() => import("@/components/efeitos/MovimentoLanding"));
const ApresentacaoProduto = lazy(() => import("@/features/apresentacao/ApresentacaoProduto"));

function PalcoReservado() {
  return (
    <div className="grid h-[560px] place-items-center rounded-2xl border border-white/10 bg-tinta-950/60 text-sm text-tinta-300" aria-busy="true">
      Carregando a demonstração…
    </div>
  );
}

/**
 * Página inicial pública (/), conforme APRESENTACAO1 v2.0:
 * abertura com a demonstração → problema → roteiro do filme → cards com exemplo e ação → rotina da loja
 * → equipe → caminhos. Conteúdo técnico (rotas, JSON, contratos) fica fora da página pública.
 */
export default function HomePage() {
  const [pedidoInicio, setPedidoInicio] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  // "com-gsap" esconde a abertura até a coreografia assumir; se o módulo não chegar em 3 s, mostra tudo
  const [esperaGsap, setEsperaGsap] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setEsperaGsap(false), 3000);
    return () => window.clearTimeout(t);
  }, []);
  const comecar = () => {
    setPedidoInicio((n) => n + 1);
    document.getElementById("percurso")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  // CTAs dos cards e da rotina: levam à demonstração, sem iniciar som (o som depende de um clique no player)
  const verDemo = () => {
    const palco = document.getElementById("percurso");
    palco?.scrollIntoView({ behavior: "smooth", block: "center" });
    palco?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  };
  return (
    <div ref={raiz} className={`relative isolate min-h-dvh overflow-x-clip bg-background pb-3 ${esperaGsap ? "com-gsap" : ""}`}>
      <Suspense fallback={null}>
        <MovimentoLanding alvo={raiz} />
      </Suspense>
      <CabecalhoPublico pagina="inicio" />
      <main id="topo">
        <Hero onComecar={comecar}>
          <Suspense fallback={<PalcoReservado />}>
            <ApresentacaoProduto pedidoInicio={pedidoInicio} />
          </Suspense>
        </Hero>
        <ProblemaSecao />
        <PesquisaSecao />
        <FilmeProduto onExplorar={verDemo} />
        <GradeBeneficios onVerDemo={verDemo} />
        <RotinaLoja onVerDemo={verDemo} />
        <PainelSecao>
          <SobreNos />
        </PainelSecao>
        <Caminhos onComecar={comecar} />
      </main>
      <div className="px-3 pt-3">
        <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px]">
          <RodapeLogin />
        </div>
      </div>
    </div>
  );
}
