# UX-02 · Linguagem de loja em todas as telas

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 3 h · **Depende de:** nada (faça antes da UX-01 e da PV-08, para elas já usarem os termos)

## Problema

Vários textos saíram do vocabulário do time, não do lojista:

- "Campanha", "Prospecção", "Proposta" e "Oportunidade" (`AgentePage.tsx`, `OportunidadesPage.tsx`);
- `cliente_ref`, `pedido_id` e `sku` aparecem em mensagens de erro da importação (`apps/importacao/services.py`, `_ler_csv` e `_mensagem`);
- "Reconciliação" e "lote #12" na tela de importação.

Na pesquisa, a dificuldade foi justamente **preencher e entender**.

## Onde mexer

- `frontend/src/lib/termos.ts` (novo): glossário único
- Telas em `frontend/src/features/**`
- Mensagens de erro em `apps/importacao/services.py` e `apps/clientes/services.py`
- `FRONTEND.md`: seção "Voz e termos"

## Passo a passo

1. **Glossário** (`termos.ts`), usado pelas telas em vez de texto solto:

   | Termo interno | Na tela |
   | --- | --- |
   | Campanha | Lista de contatos |
   | Prospecção / rodar prospecção | Buscar clientes para oferecer |
   | Proposta (de contato) | Sugestão |
   | Confirmar proposta | Aprovar mensagem |
   | Oportunidade | O que dá para melhorar |
   | `cliente_ref` | Código do cliente |
   | `pedido_id` / `item_id` | Número da venda / item da venda |
   | SKU | Código do produto (tamanho/cor) |
   | Reconciliação | Conferência do total |
   | Lote | Envio |
   | Demanda não atendida | Procuraram e não tinha |
   | Snapshot de estoque | Estoque do dia |

2. **Regras de texto** (vão para o `FRONTEND.md`):
   - verbo no botão ("Aprovar mensagem", não "OK");
   - número com contexto ("3 clientes", não "3");
   - erro diz **o que aconteceu e o que fazer** ("A coluna Data está vazia na linha 8. Preencha e envie de novo.");
   - nada de inglês nem de nome de campo do banco na tela;
   - frases com até 15 palavras na ação principal.
3. **Erros da importação:** mostre o nome da coluna **como veio no arquivo do lojista** (depois da PV-02, use o mapa ao contrário) e não o nome interno.
4. **Varredura:** `grep -rn "cliente_ref\|pedido_id\|Prospec\|Campanha\|lote #" frontend/src` e revise cada ocorrência que aparece na tela. Não mude nomes de API nem de variável; só o texto exibido.

## Como testar

- Ajuste os testes do Vitest que procuram textos antigos.
- **Revisão de leitura:** uma pessoa de fora do time lê cada tela e diz o que cada botão faz. Anote no PR o que ela não entendeu.

## Pronto quando

- [ ] O `termos.ts` existe e é usado nas telas.
- [ ] Nenhum nome de campo interno aparece na tela nem nas mensagens de erro.
- [ ] A seção "Voz e termos" está no `FRONTEND.md`.
