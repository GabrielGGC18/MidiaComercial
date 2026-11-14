// Relógio único do percurso. Com áudio tocando, o tempo do áudio governa; sem som, conta o tempo
// real. Pausar guarda a posição exata; continuar segue dali (não reinicia a fala).
import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIOS } from "./audios.gerado";
import { inicioDe, SEGMENTOS, segmentoEm, TOTAL_MS } from "./cenario-balcao";

const PASSO_MS = 50;

export type StatusRelogio = "pronto" | "tocando" | "pausado" | "aguardando" | "fim";

export function useRelogio() {
  const [pos, setPos] = useState(0);
  const [status, setStatus] = useState<StatusRelogio>("pronto");
  const [som, setSom] = useState(false);
  const [guiado, setGuiado] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [somBloqueado, setSomBloqueado] = useState(false);

  const posRef = useRef(0);
  const ultimo = useRef(0);
  const audio = useRef<HTMLAudioElement | null>(null);
  const estado = useRef({ status, som, guiado, confirmado });
  estado.current = { status, som, guiado, confirmado };

  const pegarAudio = () => {
    if (!audio.current && typeof Audio !== "undefined") audio.current = new Audio();
    return audio.current;
  };

  const pararAudio = () => audio.current?.pause();

  const mover = useCallback((p: number) => {
    posRef.current = Math.max(0, Math.min(TOTAL_MS, p));
    setPos(posRef.current);
  }, []);

  /** Garante que o áudio do segmento atual toca a partir do ponto certo. */
  const sincronizarAudio = useCallback(() => {
    const { som: comSom } = estado.current;
    const i = segmentoEm(posRef.current);
    const seg = SEGMENTOS[i];
    const a = pegarAudio();
    if (!a) return false;
    if (!comSom || !seg || posRef.current >= seg.inicioMs + seg.audioMs) {
      a.pause();
      return false;
    }
    const src = AUDIOS[seg.id].src;
    const alvo = (posRef.current - seg.inicioMs) / 1000;
    if (!a.src.endsWith(src)) {
      a.src = src;
      a.currentTime = alvo;
    } else if (Math.abs(a.currentTime - alvo) > 0.3) a.currentTime = alvo;
    if (a.paused) {
      const r = a.play();
      if (r && typeof r.catch === "function")
        r.catch(() => {
          setSom(false);
          setSomBloqueado(true);
        });
    }
    return true;
  }, []);

  useEffect(() => {
    if (status !== "tocando") return;
    ultimo.current = Date.now();
    const t = window.setInterval(() => {
      const agora = Date.now();
      const dt = agora - ultimo.current;
      ultimo.current = agora;
      const i = segmentoEm(posRef.current);
      const seg = SEGMENTOS[i];
      const tocandoAudio = sincronizarAudio();
      const a = audio.current;
      let p = tocandoAudio && a && !a.paused && seg ? seg.inicioMs + a.currentTime * 1000 : posRef.current + dt;

      // Confirmação explícita no modo explorável: nunca um clique automático (melhoria-design §4)
      const espera = SEGMENTOS.find((s) => s.aguardar);
      const { guiado: g, confirmado: c } = estado.current;
      if (espera && !g && !c && p >= espera.inicioMs) {
        p = espera.inicioMs;
        mover(p);
        pararAudio();
        setStatus("aguardando");
        return;
      }
      if (p >= TOTAL_MS) {
        mover(TOTAL_MS);
        pararAudio();
        setStatus("fim");
        return;
      }
      mover(p);
    }, PASSO_MS);
    return () => window.clearInterval(t);
  }, [status, mover, sincronizarAudio]);

  // Trocar de aba pausa; ao voltar, a pessoa continua (sem acelerar para compensar)
  useEffect(() => {
    const aoMudar = () => {
      if (document.hidden && estado.current.status === "tocando") {
        pararAudio();
        setStatus("pausado");
      }
    };
    document.addEventListener("visibilitychange", aoMudar);
    return () => document.removeEventListener("visibilitychange", aoMudar);
  }, []);

  useEffect(() => () => pararAudio(), []);

  const tocar = useCallback(
    (comSom?: boolean) => {
      if (comSom !== undefined) {
        setSom(comSom);
        estado.current.som = comSom;
        if (comSom) setSomBloqueado(false);
      }
      if (posRef.current >= TOTAL_MS) {
        mover(0);
        setConfirmado(false);
      }
      setStatus("tocando");
      sincronizarAudio(); // dentro do gesto do clique: o navegador libera o som
    },
    [mover, sincronizarAudio],
  );

  const pausar = useCallback(() => {
    pararAudio();
    setStatus((s) => (s === "tocando" ? "pausado" : s));
  }, []);

  const irPara = useCallback(
    (p: number) => {
      pararAudio();
      mover(p);
      // voltar para antes da confirmação invalida o registro confirmado
      const espera = SEGMENTOS.find((s) => s.aguardar);
      if (espera && p <= espera.inicioMs) setConfirmado(false);
      else if (espera && p > espera.inicioMs) setConfirmado(true);
      setStatus((s) => (s === "pronto" || s === "fim" || s === "aguardando" ? "pausado" : s));
    },
    [mover],
  );

  const confirmar = useCallback(() => {
    setConfirmado(true);
    estado.current.confirmado = true;
    setStatus("tocando");
    sincronizarAudio();
  }, [sincronizarAudio]);

  const recomecar = useCallback(() => {
    pararAudio();
    mover(0);
    setConfirmado(false);
    estado.current.confirmado = false;
    setStatus("tocando");
    sincronizarAudio();
  }, [mover, sincronizarAudio]);

  const alternarSom = useCallback(() => {
    const novo = !estado.current.som;
    setSom(novo);
    estado.current.som = novo;
    if (novo) setSomBloqueado(false);
    if (novo && estado.current.status === "tocando") sincronizarAudio();
    if (!novo) pararAudio();
  }, [sincronizarAudio]);

  return {
    pos,
    status,
    som,
    somBloqueado,
    guiado,
    confirmado: confirmado || guiado,
    setGuiado,
    tocar,
    pausar,
    irPara,
    confirmar,
    recomecar,
    alternarSom,
    inicioDe,
  };
}

export type Relogio = ReturnType<typeof useRelogio>;
