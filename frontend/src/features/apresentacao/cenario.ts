// Cenário fictício da apresentação pública (spec ANIMACAO-Tela §6 e §9; decisão em docs/08 §13).
// Tudo aqui é demonstrativo: nenhum dado real, nenhuma chamada ao backend, nenhum envio.
// Valores em centavos para a conta fechar sem erro de ponto flutuante.

export const CAPITULOS = [
  { id: "receber", rotulo: "Receber", legenda: "Os dados da venda chegam ao MidiaComercial." },
  { id: "preencher", rotulo: "Preencher", legenda: "O que já foi registrado pode ser aproveitado." },
  { id: "validar", rotulo: "Validar", legenda: "Dados conferidos. Histórico atualizado." },
  { id: "visualizar", rotulo: "Visualizar", legenda: "A mesma venda aparece nos indicadores." },
  { id: "sugerir", rotulo: "Sugerir", legenda: "O agente prepara uma próxima oferta com contexto." },
  { id: "revisar", rotulo: "Revisar", legenda: "A decisão sobre o contato continua com o vendedor." },
] as const;

export type CapituloId = (typeof CAPITULOS)[number]["id"];
export const ULTIMO = CAPITULOS.length - 1;

/** Tempo de leitura de cada capítulo no modo automático (ms). Direção de movimento, não medição. */
export const DURACAO_MS = [4000, 8000, 6000, 8000, 10000, 0];

export type Cenario = "principal" | "sem-cliente";

export const LOJA = "Loja Exemplo";
export const DIA_DEMO = "Sábado, 14/11 · dia da demonstração";

export const VENDA = {
  codigo: "VEN-2048",
  origem: "Arquivo demonstrativo",
  produto: "Boné preto",
  sku: "BON-PRE-U",
  quantidade: 1,
  valor: 8990,
  horario: "16h20",
  estado: "Concluída",
};

export const CLIENTE = {
  nome: "Ana Costa",
  codigo: "CL-017",
  tamanhoCamisa: "M",
  contatoPermitido: true,
  comprasAntes: 3,
};

export const ESTOQUE_BONE = { antes: 8, depois: 7 };

export const SERIE_ANTES: { faixa: string; receita: number }[] = [
  { faixa: "10h", receita: 22010 },
  { faixa: "11h", receita: 18000 },
  { faixa: "12h", receita: 15000 },
  { faixa: "13h", receita: 9000 },
  { faixa: "14h", receita: 28000 },
  { faixa: "15h", receita: 20000 },
  { faixa: "16h", receita: 22000 },
];
export const FAIXA_DA_VENDA = "16h";
export const PEDIDOS_ANTES = 12;

export interface Peca {
  id: string;
  nome: string;
  variante: string;
  preco: number;
  saldo: number;
  motivo: string;
  criterio: string;
  revisar: string;
}

export const PECAS: Peca[] = [
  {
    id: "camisa",
    nome: "Camisa básica off-white",
    variante: "M",
    preco: 12990,
    saldo: 3,
    motivo: "Combinação cadastrada pela loja para bonés; tamanho M já informado no cadastro.",
    criterio: "Combinação aprovada pelo lojista",
    revisar: "Confirme se a cor agrada à cliente.",
  },
  {
    id: "short",
    nome: "Short grafite",
    variante: "M",
    preco: 11990,
    saldo: 5,
    motivo: "Mesma combinação \"look casual\"; tamanho M do cadastro.",
    criterio: "Combinação aprovada pelo lojista",
    revisar: "Confira o saldo antes do contato.",
  },
];

export const mensagemContato = (peca: Peca) =>
  `Oi, ${CLIENTE.nome.split(" ")[0]}! Aqui é da ${LOJA}. Temos ${peca.id === "camisa" ? "uma camisa básica off-white" : "um short grafite"} que pode combinar com o boné preto da sua compra. Quer conhecer a peça? Se preferir não receber mensagens, é só avisar.`;

export interface Fala {
  id: string;
  texto: string;
  /** capítulo em que a fala aparece */
  cap: number;
  tom?: "atencao";
}

const FALAS_PRINCIPAL: Fala[] = [
  { id: "recebi", cap: 0, texto: "Recebi a venda VEN-2048: 1 boné preto, no valor de R$ 89,90." },
  { id: "cliente", cap: 1, texto: "O código CL-017 corresponde à Ana Costa no cadastro desta loja." },
  { id: "preenchi", cap: 1, texto: "Preenchi produto, quantidade, valor e data com os dados recebidos." },
  { id: "conferi", cap: 2, texto: "A venda foi conferida e adicionada ao histórico deste cliente." },
  { id: "indicadores", cap: 3, texto: "Os indicadores agora incluem esta venda." },
  { id: "combinacao", cap: 4, texto: "Há uma combinação cadastrada para este boné. Separei duas opções disponíveis para você revisar." },
  { id: "contexto", cap: 4, texto: "O tamanho M já consta no cadastro de camisa. Ele não foi deduzido da compra do boné." },
  { id: "revisao", cap: 5, texto: "Preparei uma sugestão de mensagem. Confira os produtos e o texto antes do contato." },
];

const FALAS_SEM_CLIENTE: Fala[] = [
  { id: "recebi", cap: 0, texto: "Recebi a venda VEN-2048: 1 boné preto, no valor de R$ 89,90." },
  { id: "sem-cliente", cap: 1, tom: "atencao", texto: "Esta venda não trouxe um cliente identificado." },
  { id: "preenchi", cap: 1, texto: "Preenchi produto, quantidade, valor e data. O histórico individual fica pendente." },
  { id: "conferi", cap: 2, texto: "A venda foi conferida. Para ligar a um cliente, informe o código do cliente no caixa." },
  { id: "indicadores", cap: 3, texto: "Os indicadores da loja incluem esta venda mesmo sem cliente." },
  { id: "sem-sugestao", cap: 4, tom: "atencao", texto: "Sem cliente identificado não há para quem sugerir. Nenhum contato é preparado." },
  { id: "revisao", cap: 5, texto: "Nada para revisar nesta venda. A próxima com cliente identificado gera sugestão." },
];

export const falasDo = (c: Cenario) => (c === "principal" ? FALAS_PRINCIPAL : FALAS_SEM_CLIENTE);
