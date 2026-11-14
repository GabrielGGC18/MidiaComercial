// Percurso principal da página inicial: procura sem estoque registrada por voz no balcão.
// Dados fictícios. A legenda é exatamente o texto falado (audios.gerado.ts).
import { AUDIOS } from "./audios.gerado";

export type Autor = "funcionario" | "assistente";
export type IdAudio = keyof typeof AUDIOS;

export interface Segmento {
  id: IdAudio;
  autor: Autor;
  /** No modo explorável, o relógio para aqui até o visitante clicar. */
  aguardar?: "confirmar-registro";
  inicioMs: number;
  duracaoMs: number; // áudio + respiro
  audioMs: number;
}

const RESPIRO_MS = 700;
const ORDEM: { id: IdAudio; autor: Autor; aguardar?: Segmento["aguardar"] }[] = [
  { id: "f-anota", autor: "funcionario" },
  { id: "a-confere", autor: "assistente" },
  { id: "f-confirma", autor: "funcionario", aguardar: "confirmar-registro" },
  { id: "a-registrado", autor: "assistente" },
  { id: "a-saldo", autor: "assistente" },
  { id: "f-pergunta", autor: "funcionario" },
  { id: "a-decide", autor: "assistente" },
];

export const SEGMENTOS: Segmento[] = ORDEM.reduce<Segmento[]>((acc, s) => {
  const ant = acc[acc.length - 1];
  const inicioMs = ant ? ant.inicioMs + ant.duracaoMs : 0;
  const audioMs = AUDIOS[s.id].duracaoMs;
  acc.push({ ...s, inicioMs, audioMs, duracaoMs: audioMs + RESPIRO_MS });
  return acc;
}, []);

export const TOTAL_MS = SEGMENTOS.reduce((t, s) => t + s.duracaoMs, 0);
export const inicioDe = (id: IdAudio) => SEGMENTOS.find((s) => s.id === id)!.inicioMs;

/** Índice do segmento em andamento (-1 antes de começar). */
export function segmentoEm(posMs: number) {
  let i = -1;
  for (let k = 0; k < SEGMENTOS.length; k++) if (posMs >= SEGMENTOS[k]!.inicioMs) i = k;
  return i;
}

/** Marcos de navegação (não são abas: só pulam o relógio). */
export const MARCOS = [
  { rotulo: "Ouvir", id: "f-anota" as IdAudio },
  { rotulo: "Conferir", id: "a-confere" as IdAudio },
  { rotulo: "Registrar", id: "a-registrado" as IdAudio },
  { rotulo: "Entender", id: "a-saldo" as IdAudio },
  { rotulo: "Decidir", id: "a-decide" as IdAudio },
];

export const ITEM = { produto: "Calça jeans", cor: "Azul", tamanho: "42", motivo: "Sem estoque" };

// Procuras do item nos últimos 7 dias (fixture). O 6º registro entra hoje, uma vez só.
export const DIAS = ["08/11", "09/11", "10/11", "11/11", "12/11", "13/11", "14/11"];
export const PROCURAS_ANTES = [1, 0, 1, 0, 2, 1, 0];
export const SALDO_INFORMADO = { valor: 0, importadoEm: "ontem, 18h" };

export const LIMITACAO = "São 6 atendimentos, não 6 compradores diferentes nem 6 vendas garantidas.";
