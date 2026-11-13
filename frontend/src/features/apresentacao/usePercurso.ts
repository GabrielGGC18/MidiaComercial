// Controle do percurso: um único relógio (setTimeout por capítulo) decide quando avançar.
// Pausa congela; voltar/pular reconstitui o estado pela função pura `estadoNo`.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Cenario, DURACAO_MS, ULTIMO } from "./cenario";
import { ESCOLHAS_INICIAIS, type Escolhas, estadoNo } from "./seletores";

export function usePercurso({ automatico = true }: { automatico?: boolean } = {}) {
  const [cenario, setCenario] = useState<Cenario>("principal");
  const [cap, setCap] = useState(-1);
  const [tocando, setTocando] = useState(false);
  const [escolhas, setEscolhas] = useState<Escolhas>(ESCOLHAS_INICIAIS);

  // Avanço automático. Para no capítulo Revisar: aprovar exige ação explícita.
  useEffect(() => {
    if (!tocando || cap < 0 || cap >= ULTIMO) return;
    const t = window.setTimeout(() => setCap((c) => Math.min(c + 1, ULTIMO)), DURACAO_MS[cap]);
    return () => window.clearTimeout(t);
  }, [tocando, cap]);

  useEffect(() => {
    if (cap >= ULTIMO) setTocando(false);
  }, [cap]);

  // Trocar de aba pausa; ao voltar, a pessoa escolhe continuar (não pula capítulos).
  useEffect(() => {
    const aoMudar = () => document.hidden && setTocando(false);
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, []);

  const irPara = useCallback((n: number) => {
    const alvo = Math.max(0, Math.min(ULTIMO, n));
    setCap(alvo);
    // voltar antes da revisão invalida a aprovação anterior
    if (alvo < ULTIMO) setEscolhas((e) => (e.revisao === "pendente" ? e : { ...e, revisao: "pendente" }));
  }, []);

  // Ações estáveis (não dependem de `cap`): efeitos que as usam não disparam a cada capítulo.
  const capRef = useRef(cap);
  capRef.current = cap;

  const acoes = useMemo(
    () => ({
      iniciar: (c: Cenario = "principal") => {
        setCenario(c);
        setEscolhas(ESCOLHAS_INICIAIS);
        setCap(0);
        setTocando(automatico);
      },
      pausar: () => setTocando(false),
      continuar: () => {
        setCap((c) => (c < 0 ? 0 : c));
        setTocando(true);
      },
      anterior: () => irPara(capRef.current - 1),
      proximo: () => irPara(capRef.current + 1),
      irPara,
      reiniciar: () => {
        setEscolhas(ESCOLHAS_INICIAIS);
        setCap(0);
        setTocando(automatico);
      },
      escolherPeca: (pecaId: string) => setEscolhas((e) => ({ ...e, pecaId, mensagem: null, revisao: "pendente" })),
      editarMensagem: (mensagem: string) => setEscolhas((e) => ({ ...e, mensagem, revisao: "pendente" })),
      aprovar: () => setEscolhas((e) => ({ ...e, revisao: "aprovada" })),
      rejeitar: () => setEscolhas((e) => ({ ...e, revisao: "rejeitada" })),
    }),
    [automatico, irPara],
  );

  const estado = useMemo(() => estadoNo(cenario, cap, escolhas), [cenario, cap, escolhas]);

  return { cenario, cap, tocando, escolhas, estado, ...acoes };
}

export type Percurso = ReturnType<typeof usePercurso>;
