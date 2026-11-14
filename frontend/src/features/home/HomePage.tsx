import { lazy, Suspense, useState } from "react";
import { ComoFunciona, FraseSinais, Hero, ResumoPercurso, RodapeLogin, Segmentos, SobreNos } from "@/components/midia/institucional";
import { CabecalhoPublico } from "./CabecalhoPublico";

// Palco animado (motion + recharts) carrega depois do texto; a área fica reservada (ANIMACAO-Tela §19)
const ApresentacaoProduto = lazy(() => import("@/features/apresentacao/ApresentacaoProduto"));

function PalcoReservado() {
  return (
    <div className="grid h-[560px] place-items-center rounded-2xl border border-border bg-card/70 text-sm text-muted-foreground" aria-busy="true">
      Carregando a demonstração…
    </div>
  );
}

/** Página inicial pública (/). Ordem: demonstração → resumo → como funciona → para quem → quem somos. */
export default function HomePage() {
  const [pedidoInicio, setPedidoInicio] = useState(0);
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip scroll-smooth">
      <CabecalhoPublico pagina="inicio" />
      <main id="topo">
        <Hero onComecar={() => setPedidoInicio((n) => n + 1)}>
          <Suspense fallback={<PalcoReservado />}>
            <ApresentacaoProduto pedidoInicio={pedidoInicio} />
          </Suspense>
        </Hero>
        <ResumoPercurso />
        <ComoFunciona />
        <Segmentos />
        <SobreNos />
        <FraseSinais />
      </main>
      <RodapeLogin />
    </div>
  );
}
