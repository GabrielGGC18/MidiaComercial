# PV-08 · "Revisar sugestões" e histórico do cliente separado por tipo

**Dono:** Pessoa 3 · **Prioridade:** P1 · **Estimativa:** 1 dia · **Depende de:** PV-07 (API das propostas com `pedido_origem`) e UX-01 (entrada no menu)

## Problema

- **Sugestões escondidas:** as propostas de contato aparecem dentro das campanhas, em `AgentePage`. Isso é bom para "produto parado", mas a sugestão de pós-venda precisa de uma **fila de revisão** própria e rápida.
- **Histórico misturado:** o histórico do cliente (`ClientesPage`) mistura tudo. O [docs/10 §7](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#7-usabilidade-para-o-usuário-final) pede separar **compra registrada**, **interesse declarado** e **sugestão inferida**.

## Onde mexer

- `frontend/src/features/sugestoes/SugestoesPage.tsx` (novo), rota `/sugestoes`
- `frontend/src/components/midia/agente.tsx` (`PropostaCard`: variações)
- `frontend/src/features/clientes/ClientesPage.tsx` (detalhe do cliente)
- Backend, se faltar algo: `GET /api/agente/propostas?tipo=contato&gatilho=compra_recente` (o filtro `gatilho` lê `campanha__gatilho`) e o campo `origem` no `PropostaOut`.

## Passo a passo

1. **Fila de revisão:** um cartão por cliente, ordenado por pontuação. Conteúdo do cartão, **nesta ordem**:
   - **Quem:** primeiro nome + "comprou Boné Preto há 2 dias" (o fato que originou).
   - **O quê:** até 3 opções, cada uma com nome, cor, tamanho, saldo e a idade do saldo ("estoque de hoje, 9h").
   - **Por quê:** a justificativa da combinação.
   - **Atenção:** `limitacao` e `campos_incertos`, num bloco âmbar com ícone e texto (ex.: "Tamanho do cliente desconhecido").
   - **Mensagem:** editável, com contador.
   - **Ações:**
     - **Preparar contato**: confirma e abre o `wa.me` em outra aba;
     - **Adiar 3 dias**: precisa de endpoint (ver item 3);
     - **Não faz sentido**: rejeita e pede o motivo em chips (já comprou, não combina, sem estoque, outro).
2. **Depois de abrir o WhatsApp,** pergunte "Conseguiu enviar?" com **Sim** ou **Ainda não**. Só o "Sim" chama `/enviada`. Abrir o link não é prova de envio (docs/10 §10).
3. **Backend mínimo** (combine com a Pessoa 2):
   - **Adiar:** `POST /api/agente/propostas/{id}/adiar` grava `dados.adiada_ate`. A lista esconde a proposta até essa data.
   - **Motivo da rejeição:** grave em `dados.motivo_rejeicao`. Ele alimenta a PV-10.
4. **Histórico do cliente** em 3 abas ou seções, com um ícone diferente em cada:
   - **Compras:** fato, vindo da venda importada;
   - **Procurou:** os interesses da PV-09, quando existir;
   - **Sugestões:** com o selo "sugestão do sistema, não é preferência do cliente".
5. **Celular:** um cartão por tela, com as ações num rodapé fixo (`pb-*` reservado; ver `chat-ui`). Todos os alvos com 44 px no mínimo.
6. **Estados:**
   - **vazio:** "Nenhuma sugestão agora. Elas aparecem quando você importa vendas de clientes com autorização de contato." + botão Importar;
   - carregando;
   - erro.

## Como testar

- **Vitest:** o cartão com `campos_incertos=["tamanho"]` mostra o aviso.
- **Vitest:** "Não faz sentido" exige o motivo.
- **Manual, de ponta a ponta:** com o seed da PV-11, confirmar → WhatsApp → "Sim" → a proposta passa a "enviada".
- **Responsivo:** 320, 375, 768 e 1280 px, nos temas claro e escuro.

## Pronto quando

- [ ] `/sugestoes` tem revisar, adiar, rejeitar com motivo e preparar contato.
- [ ] O envio só é marcado depois do "Sim" do vendedor.
- [ ] O histórico do cliente separa compra, procura e sugestão.
- [ ] O fluxo completo funciona em 375 px com uma mão.
