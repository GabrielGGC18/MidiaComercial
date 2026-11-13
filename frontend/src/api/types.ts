// Contrato da API (espelha os schemas do Django Ninja em /api/openapi.json)

export type StatusDados = "suficiente" | "amostra_limitada" | "bloqueada";
export type Fonte = "vendas" | "demanda" | "estoque" | "acao";
export type Motivo = "indisponivel" | "variacao_ausente" | "preco" | "prazo" | "outro";
export type Situacao = "aberta" | "concluida" | "descartada";

export interface LojaResumo {
  id: number;
  nome: string;
  segmento: string;
  demo: boolean;
  papel: string;
}

export interface Me {
  usuario: { id: number; username: string; nome: string; is_staff: boolean };
  loja: LojaResumo | null;
  papel: string | null;
  lojas: LojaResumo[];
}

export interface Evidencia {
  fonte: Fonte;
  descricao: string;
  valor: string;
  periodo_inicio: string;
  periodo_fim: string;
  amostra: number;
}

export interface Oportunidade {
  id: number;
  regra: string;
  regra_nome: string;
  versao_regra: string;
  status: StatusDados;
  titulo: string;
  acao_sugerida: string;
  limitacao: string;
  medicao_sugerida: string;
  explicacao: string;
  alvo: Record<string, unknown>;
  prioridade: number;
  evidencias: Evidencia[];
  plano_id: number | null;
  descartada_em: string | null;
}

export interface Bloqueio {
  regra: string;
  nome: string;
  motivo: string | null;
  como_liberar: string | null;
}

export interface Qualidade {
  receita_janela: number;
  ticket_medio: number;
  pedidos_na_janela: number;
  itens_na_janela: number;
  demandas_na_janela: number;
  cobertura_cliente_pct: number;
  idade_estoque_horas: number | null;
  estoque_atualizado: boolean;
  skus_com_saldo: number;
}

export interface Painel {
  execucao: { id: number; janela_inicio: string; janela_fim: string; executado_em: string };
  qualidade: Qualidade;
  cartoes: Oportunidade[];
  bloqueios: Bloqueio[];
}

export interface ErroCampo {
  campo: string | null;
  mensagem: string;
}

export interface Reconciliacao {
  origem: string;
  importado: string;
  diferenca: string;
  percentual: string;
  nivel: "ok" | "atencao" | "alto";
}

export interface Lote {
  id: number;
  tipo: "vendas" | "estoque";
  status: "previa" | "confirmado" | "cancelado" | "falhou";
  nome_arquivo: string;
  linhas_ok: number;
  linhas_rejeitadas: number;
  linhas_duplicadas: number;
  total_importado: string;
  total_origem_informado: string | null;
  criado_em: string;
  confirmado_em: string | null;
  reconciliacao: Reconciliacao | null;
  previa: Record<string, string | number | null>[];
  rejeitadas: { numero_linha: number; erros: ErroCampo[] }[];
}

export interface LoteResumo {
  id: number;
  tipo: string;
  status: string;
  nome_arquivo: string;
  linhas_ok: number;
  linhas_rejeitadas: number;
  total_importado: string;
  criado_em: string;
}

export interface CategoriaPublico {
  categoria: string;
  receita: string;
  unidades: number;
  pedidos: number;
  participacao_receita: string;
}

export interface Publico {
  inicio: string;
  fim: string;
  kpis: { receita: string; devolucoes: string; pedidos: number; ticket_medio: string; itens: number };
  cobertura: { percentual: string; identificados: number; total: number };
  categorias: CategoriaPublico[];
  heatmap: { dia: number; hora: number; pedidos: number }[];
  serie_diaria: { data: string; receita: string }[];
  recorrencia: {
    status: StatusDados;
    motivo: string | null;
    clientes_identificados: number;
    compra_unica_pct: string | null;
    recorrentes_pct: string | null;
  };
  periodos: Periodos;
  faixas: FaixasPublico;
}

export interface ProdutoCatalogo {
  id: number;
  nome: string;
  categoria: string;
  tamanhos: string[];
  cores: string[];
  variantes: { sku: string; tamanho: string; cor: string }[];
}

export interface DemandaRegistrada {
  id: number;
  rotulo: string;
  sku: string | null;
  motivo: Motivo;
  motivo_rotulo: string;
  registrado_em: string;
  no_catalogo: boolean;
  faixa_etaria: string;
}

export interface DemandaIn {
  produto_id?: number | null;
  produto_texto?: string | null;
  categoria?: string | null;
  tamanho?: string | null;
  cor?: string | null;
  motivo: Motivo;
  faixa_etaria?: Faixa | null;
}

export interface ItemRanking {
  chave: string;
  rotulo: string;
  sku: string | null;
  categoria: string;
  total: number;
  por_motivo: Record<string, number>;
  saldo: number | null;
  no_catalogo: boolean;
}

export interface Ranking {
  inicio: string;
  fim: string;
  total: number;
  por_motivo: Record<string, number>;
  itens: ItemRanking[];
}

export interface Medicao {
  id: number;
  periodo_antes_inicio: string;
  periodo_antes_fim: string;
  periodo_depois_inicio: string;
  periodo_depois_fim: string;
  valor_antes: string;
  valor_depois: string | null;
  contexto: string;
  criado_em: string;
}

export interface Plano {
  id: number;
  titulo: string;
  responsavel: string;
  prazo: string;
  indicador: string;
  situacao: Situacao;
  justificativa: string;
  criado_em: string;
  atrasado: boolean;
  oportunidade: { id: number; regra: string; titulo: string; status: StatusDados } | null;
  medicoes: Medicao[];
}

export interface SugestaoMedicao {
  periodo_antes_inicio: string;
  periodo_antes_fim: string;
  periodo_depois_inicio: string;
  periodo_depois_fim: string;
  valor_antes: string;
  valor_depois: string;
  unidade: string;
  periodo_depois_completo: boolean;
}

// ── v0.2: período por nicho, faixa etária, clientes e agente ───────────────────
export type Faixa = "ate_17" | "18_24" | "25_34" | "35_44" | "45_59" | "60_mais";

export interface Periodos {
  top: { periodo: string; dia: number; faixa: number; receita: string; pedidos: number; participacao: string }[];
  por_categoria: {
    categoria: string;
    melhor_periodo: string;
    dia: number;
    faixa: number;
    participacao: string;
    unidades: number;
    amostra_limitada: boolean;
  }[];
  turnos: { turno: string; participacao: string }[];
  fases_mes: { fase: string; receita: string; pedidos: number; participacao: string }[];
  limitacao: string;
}

export interface FaixasPublico {
  faixas: {
    faixa: Faixa;
    rotulo: string;
    pedidos: number;
    receita: string;
    participacao: string;
    ticket_medio: string;
    categoria_preferida: string | null;
    procuras_nao_atendidas: number;
  }[];
  cobertura: { percentual: string; com_faixa: number; total: number };
  principal: string | null;
  status: StatusDados;
  limitacao: string;
}

export interface Cliente {
  id: number;
  ref: string;
  nome: string;
  whatsapp: string;
  faixa_etaria: Faixa | "";
  faixa_rotulo: string;
  tamanhos: string[];
  categorias_interesse: string[];
  observacao: string;
  consentimento_contato: boolean;
  consentimento_em: string | null;
  origem: string;
  ultimo_contato_em: string | null;
  em_descanso: boolean;
  pedidos: number;
  ultima_compra: string | null;
  gasto: string;
  categorias_compradas: string[];
}

export interface PropostaAgente {
  id: number;
  tipo: "demanda" | "cliente" | "contato";
  status: "pendente" | "confirmada" | "rejeitada" | "enviada";
  resumo: string;
  dados: Record<string, unknown>;
  campos_incertos: string[];
  motivos: string[];
  limitacao: string;
  pontuacao: number;
  campanha_id: number | null;
  cliente: { id: number; nome: string; ref: string; faixa_rotulo: string; tamanhos: string[]; whatsapp_final: string } | null;
  criado_em: string;
  decidido_em: string | null;
  enviado_em: string | null;
  objeto_criado: string;
}

export interface RespostaAgente {
  sessao_id: number;
  provedor: string;
  resposta: string;
  propostas: PropostaAgente[];
}

export interface Campanha {
  id: number;
  titulo: string;
  gatilho: "estoque_parado" | "queda_vendas";
  alvo: { sku?: string | null; rotulo: string; categoria: string; tamanho?: string; saldo?: number | null; tamanhos_com_estoque?: string[] };
  motivo: string;
  status: "proposta" | "ativa" | "encerrada";
  criado_em: string;
  medicao: { propostas: number; aprovadas: number; enviadas: number; convertidos: number; limitacao: string };
  propostas: PropostaAgente[];
}
