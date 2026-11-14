// O que a tela mostra = função pura da posição do relógio. Voltar/pular nunca soma de novo.
import { AUDIOS } from "./audios.gerado";
import { type Autor, inicioDe, type IdAudio, PROCURAS_ANTES, SEGMENTOS, segmentoEm } from "./cenario-balcao";

export interface FalaVisivel {
  id: IdAudio;
  autor: Autor;
  texto: string;
  duracaoMs: number;
  picos: readonly number[];
  /** 0..1 do áudio desta fala */
  progresso: number;
  atual: boolean;
}

export type Foco = "ouvindo" | "proposta" | "confirmar" | "registro" | "grafico" | "decisao";

export function estadoBalcao(pos: number, confirmado: boolean) {
  const i = segmentoEm(pos);
  const falas: FalaVisivel[] = SEGMENTOS.slice(0, i + 1)
    // a fala de confirmação só aparece depois que alguém confirmou
    .filter((s) => !s.aguardar || confirmado)
    .map((s, k, arr) => ({
      id: s.id,
      autor: s.autor,
      texto: AUDIOS[s.id].texto,
      duracaoMs: s.audioMs,
      picos: AUDIOS[s.id].picos,
      progresso: Math.max(0, Math.min(1, (pos - s.inicioMs) / s.audioMs)),
      atual: k === arr.length - 1,
    }));

  const desde = (id: IdAudio) => pos >= inicioDe(id);
  const registrado = confirmado && desde("a-registrado");
  const procuras = PROCURAS_ANTES.map((v, d) => (registrado && d === PROCURAS_ANTES.length - 1 ? v + 1 : v));

  // Campos da proposta aparecem um a um enquanto o assistente fala "Entendi. Calça jeans azul, 42…"
  const conf = SEGMENTOS.find((s) => s.id === "a-confere")!;
  const camposVisiveis = pos < conf.inicioMs ? 0 : Math.min(4, 1 + Math.floor(((pos - conf.inicioMs) / conf.audioMs) * 4));

  let foco: Foco = "ouvindo";
  if (desde("a-confere")) foco = "proposta";
  if (desde("f-confirma") && !confirmado) foco = "confirmar";
  if (registrado) foco = "registro";
  if (registrado && desde("a-saldo")) foco = "grafico";
  if (registrado && desde("a-decide")) foco = "decisao";

  return {
    comecou: i >= 0,
    falas,
    foco,
    camposVisiveis,
    registrado,
    total: procuras.reduce((s, v) => s + v, 0),
    totalAntes: PROCURAS_ANTES.reduce((s, v) => s + v, 0),
    procuras,
  };
}

export type EstadoBalcao = ReturnType<typeof estadoBalcao>;
