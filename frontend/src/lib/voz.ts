// Captação de voz no navegador (Web Speech API, pt-BR). O servidor recebe só o TEXTO.
import { useCallback, useEffect, useRef, useState } from "react";

interface Reconhecimento {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function criar(): Reconhecimento | null {
  const w = window as unknown as Record<string, unknown>;
  const C = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Reconhecimento) | undefined;
  return C ? new C() : null;
}

export const vozSuportada = () =>
  typeof window !== "undefined" && !!((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

const ERROS: Record<string, string> = {
  "not-allowed": "Permita o uso do microfone no navegador.",
  "no-speech": "Não ouvi nada. Tente de novo, mais perto do celular.",
  network: "Sem conexão com o serviço de voz do navegador. Use o teclado.",
};

export function useVoz(onFinal: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false);
  const [parcial, setParcial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const rec = useRef<Reconhecimento | null>(null);
  const final = useRef(onFinal);
  final.current = onFinal;

  useEffect(() => () => rec.current?.stop(), []);

  const iniciar = useCallback(() => {
    const r = criar();
    if (!r) {
      setErro("Seu navegador não tem reconhecimento de voz. Use o teclado.");
      return;
    }
    setErro(null);
    setParcial("");
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let txt = "";
      let fim = false;
      for (let i = 0; i < e.results.length; i++) {
        txt += e.results[i][0].transcript;
        fim = fim || e.results[i].isFinal;
      }
      setParcial(txt);
      if (fim) final.current(txt.trim());
    };
    r.onerror = (e) => setErro(ERROS[e.error] ?? "Não consegui ouvir. Tente de novo.");
    r.onend = () => setOuvindo(false);
    rec.current = r;
    setOuvindo(true);
    r.start();
  }, []);

  const parar = useCallback(() => rec.current?.stop(), []);
  return { ouvindo, parcial, erro, iniciar, parar, suportada: vozSuportada() };
}
