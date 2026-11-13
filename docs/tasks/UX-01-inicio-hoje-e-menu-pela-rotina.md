# UX-01 · Tela "Hoje" e menu organizado pela rotina do vendedor

**Dono:** Pessoa 3 · **Prioridade:** P1 · **Estimativa:** 6 h · **Depende de:** P3-01 e P3-02 (centralização e menu sanduíche); combine com a PV-08 a rota `/sugestoes`

## Problema

O menu (`frontend/src/app/layouts/AppShell.tsx`, `GRUPOS`) segue **funções técnicas**: Analisar, Agir e Dados, com 8 itens. Quem usa no dia a dia é o vendedor, que quer fazer três coisas:

1. **Registrar procura** (no balcão);
2. **Revisar sugestões** (quem chamar e com o quê);
3. **Acompanhar retornos** (quem já foi chamado e o que respondeu).

Outros problemas:
- todo mundo abre em "Oportunidades", inclusive o atendente, que só usa o Balcão;
- no celular, o `NAV_MOBILE` não tem Balcão, que é a tela mais usada no celular.

## Onde mexer

- `frontend/src/app/layouts/AppShell.tsx`: `GRUPOS` e `NAV_MOBILE`
- `frontend/src/app/router.tsx`: rota inicial por papel
- `frontend/src/features/hoje/HojePage.tsx` (novo)
- Backend, se não houver: `GET /api/hoje` (atendente+), com contadores por papel

## Passo a passo

1. **Novo menu:**
   ```ts
   const GRUPOS = [
     { titulo: "Dia a dia", itens: [
       { to: "/", rotulo: "Hoje", Icone: Sun, fim: true },
       { to: "/balcao", rotulo: "Registrar procura", Icone: Smartphone },
       { to: "/sugestoes", rotulo: "Revisar sugestões", Icone: Sparkles },      // PV-08
       { to: "/retornos", rotulo: "Acompanhar retornos", Icone: MessageCircle }, // propostas enviadas + interesses
     ]},
     { titulo: "Entender a loja", itens: [ /* Oportunidades, Meu público, Procuraram e não tinha */ ]},
     { titulo: "Loja", itens: [ /* Clientes, Importar dados, Combinações (PV-06), Plano de ação */ ]},
   ];
   ```
   - Filtre por papel: o atendente vê só "Dia a dia" (sem "Revisar sugestões", se a confirmação continuar sendo de gerente).
   - O Agente (chat) fica no cabeçalho, como ajuda, não como item de rotina.
2. **Celular, menu de baixo:** Hoje · Registrar · Sugestões · Retornos. O resto fica no sanduíche (P3-02).
3. **Rota inicial por papel:** o atendente cai em `/balcao`; o gerente e o dono, em `/` (Hoje). Use `me.papel` e um `<Navigate>` no índice.
4. **Tela Hoje:**
   - **3 cartões grandes**, um por ação da rotina, cada um com o número do dia e um verbo:
     - "3 sugestões para revisar →";
     - "2 retornos sem resposta há 3 dias →";
     - "Registrar procura →".
   - **Faixa de saúde dos dados:** "Vendas importadas até ontem 18h · Estoque de hoje 9h". Use âmbar quando o estoque estiver mais velho que `b_max_horas_estoque`, com um botão Importar.
   - **Abaixo:** as 3 oportunidades principais (resumo da tela atual) e "Resultados da semana" (PV-10), quando existir.
5. **`/retornos`:**
   - lista das propostas `enviada`, com o desfecho (PV-10), e dos interesses `aguardando`/`contatado` (PV-09);
   - filtros em chips: "Sem resposta", "Responderam", "Aguardando chegada".

## Como testar

- **Atendente:** faz login e cai no Balcão. O menu tem só os itens de rotina permitidos.
- **Gerente:** vê o Hoje com os contadores certos (teste com o seed).
- **Celular:** em 375 px, o menu de baixo tem as 4 ações e nada fica coberto pela barra fixa.
- **Vitest:** o filtro do menu por papel.

## Pronto quando

- [ ] O menu está organizado pela rotina, e os rótulos seguem a UX-02.
- [ ] A rota inicial depende do papel.
- [ ] O Hoje tem as 3 ações com contadores e a faixa de saúde dos dados.
- [ ] O `/retornos` existe.
- [ ] Testado em 320, 375, 768, 1280 e 1920 px, nos temas claro e escuro.
