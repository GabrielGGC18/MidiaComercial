import { lazy, Suspense, useState } from "react";
import { ComoFunciona, RodapeLogin, SobreNos } from "@/components/midia/institucional";
import { BlocosProduto, CamadasProduto, FaixaFatos, FeitoParaAuditar, FluxoTresColunas } from "@/components/midia/tecnico";
import { EscadaProblema, SemanaNaLoja } from "@/components/midia/capitulos";
import { Caminhos, Diferenciais, Hero, PainelSecao } from "@/components/midia/vitrine";
import { CabecalhoPublico } from "./CabecalhoPublico";

// Palco animado (motion + recharts) carrega depois do texto; a área fica reservada (ANIMACAO-Tela §19)
const ApresentacaoProduto = lazy(() => import("@/features/apresentacao/ApresentacaoProduto"));

function PalcoReservado() {
  return (
    <div className="grid h-[560px] place-items-center rounded-2xl border border-white/10 bg-tinta-950/60 text-sm text-tinta-300" aria-busy="true">
      Carregando a demonstração…
    </div>
  );
}

/**
 * Página inicial pública (/), em painéis empilhados:
 * abertura com a demonstração → problema (escada) → por que → semana (sanfona) → parte técnica
 * (camadas, fatos, blocos com API, auditoria, modelo) → telas reais → quem somos → caminhos.
 * Movimento: ref. pibaru.com (components/efeitos/Revelar). Parte técnica: ref. helenacrm.com.
 */
export default function HomePage() {
  const [pedidoInicio, setPedidoInicio] = useState(0);
  const comecar = () => {
    setPedidoInicio((n) => n + 1);
    document.getElementById("percurso")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  return (
    <div className="relative isolate min-h-dvh overflow-x-clip bg-background pb-3">
      <CabecalhoPublico pagina="inicio" />
      <main id="topo">
        <Hero onComecar={comecar}>
          <Suspense fallback={<PalcoReservado />}>
            <ApresentacaoProduto pedidoInicio={pedidoInicio} />
          </Suspense>
        </Hero>
        <EscadaProblema />
        <Diferenciais />
        <SemanaNaLoja />
        <CamadasProduto />
        <FaixaFatos />
        <BlocosProduto />
        <FeitoParaAuditar />
        <FluxoTresColunas />
        <PainelSecao capitulo="violeta">
          <ComoFunciona />
        </PainelSecao>
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
