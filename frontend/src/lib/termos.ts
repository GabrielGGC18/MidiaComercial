// Glossário da tela (UX-02): nome interno → palavra de loja. Não muda API nem variável.

const REGRA: Record<string, string> = {
  "Lacuna de mix": "Falta no estoque",
};

/** Nome da regra como o lojista entende. Sem mapa, usa o nome que veio da API. */
export const rotuloRegra = (nome: string) => REGRA[nome] ?? nome;
