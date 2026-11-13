// Estado exibido = função pura de (cenário, capítulo, escolhas). Voltar, pular ou reiniciar
// nunca duplica a venda: nada é "somado" por efeito colateral (ANIMACAO-Tela §14).
import {
  CLIENTE,
  type Cenario,
  ESTOQUE_BONE,
  FAIXA_DA_VENDA,
  falasDo,
  PECAS,
  PEDIDOS_ANTES,
  SERIE_ANTES,
  VENDA,
} from "./cenario";

export type Revisao = "pendente" | "aprovada" | "rejeitada";

export interface Escolhas {
  pecaId: string;
  mensagem: string | null; // null = texto sugerido, sem edição
  revisao: Revisao;
}

export const ESCOLHAS_INICIAIS: Escolhas = { pecaId: PECAS[0]!.id, mensagem: null, revisao: "pendente" };

export interface Kpis {
  pedidos: number;
  receita: number;
  ticket: number;
}

export function kpisDa(serie: { receita: number }[], pedidos: number): Kpis {
  const receita = serie.reduce((s, p) => s + p.receita, 0);
  return { pedidos, receita, ticket: Math.round(receita / pedidos) };
}

/** cap = -1: em espera (nada aconteceu ainda). */
export function estadoNo(cenario: Cenario, cap: number, escolhas: Escolhas) {
  const temCliente = cenario === "principal";
  const vendaContada = cap >= 2; // entra no histórico e nos números depois de validada, uma vez só

  const serie = SERIE_ANTES.map((p) =>
    vendaContada && p.faixa === FAIXA_DA_VENDA ? { ...p, receita: p.receita + VENDA.valor } : p,
  );
  const kpisAntes = kpisDa(SERIE_ANTES, PEDIDOS_ANTES);
  const kpis = vendaContada ? kpisDa(serie, PEDIDOS_ANTES + 1) : kpisAntes;

  return {
    cap,
    temCliente,
    falas: falasDo(cenario).filter((f) => f.cap <= cap),
    vendaVisivel: cap >= 0,
    grupos: {
      cliente: cap >= 1,
      item: cap >= 1,
      transacao: cap >= 1,
    },
    validado: cap >= 2,
    comprasCliente: temCliente ? CLIENTE.comprasAntes + (vendaContada ? 1 : 0) : null,
    estoqueBone: vendaContada ? ESTOQUE_BONE.depois : ESTOQUE_BONE.antes,
    serie,
    kpisAntes,
    kpis,
    sugestoes: temCliente && cap >= 4 ? PECAS : [],
    emRevisao: temCliente && cap >= 5,
    // revisão só vale no capítulo Revisar; voltar invalida a aprovação anterior
    revisao: cap >= 5 ? escolhas.revisao : ("pendente" as Revisao),
  };
}

export type EstadoPalco = ReturnType<typeof estadoNo>;
