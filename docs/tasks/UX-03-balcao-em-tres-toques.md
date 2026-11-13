# UX-03 · Balcão em até 3 toques (com "Avisar quando chegar")

**Dono:** Pessoa 3 · **Prioridade:** P1 (a parte de interesse é P2, junto com a PV-09) · **Estimativa:** 6 h · **Depende de:** P3-03 (responsivo); PV-09 para a opção de aviso

## Problema

O balcão é usado **com o cliente na frente**, no celular, muitas vezes com uma mão só. Hoje, a `BalcaoPage.tsx` tem:
- a voz e a frase livre no topo (bom);
- o formulário depois;
- a busca de produto por texto.

**Meta:** registrar a procura mais comum em **3 toques**: produto → tamanho/cor → motivo.

## Onde mexer

- `frontend/src/features/demanda/BalcaoPage.tsx`
- `frontend/src/components/midia/` (chips, se faltar)
- Backend: `GET /api/publico/catalogo/recentes` (mais procurados e mais vendidos da semana), caso não exista. Ver `buscar_catalogo` em `apps/publico/services.py`.

## Passo a passo

1. **Produto em um toque:** antes da busca, mostre uma grade com os **8 produtos mais procurados ou vendidos na semana**, cada um como botão de 48 px com nome curto. A busca continua para o resto.
2. **Tamanho e cor em chips,** vindos das variantes do produto escolhido (`Variante.tamanho` e `cor`, que a PV-03 preenche):
   - não use `<select>`;
   - o chip sem estoque mostra o ícone "sem estoque" e o texto, e continua clicável, porque é isso que se registra.
3. **Motivo em chips grandes:** "Sem estoque", "Sem o tamanho/cor", "Preço", "Prazo" e "Outro". Pré-selecione **"Sem o tamanho/cor"** quando o produto existe, mas a variante escolhida tem saldo 0.
4. **Botão Registrar** fixo no rodapé, com a safe area. Depois de registrar:
   - toast "Registrado ✓" com **Desfazer** por 5 s (crie `DELETE` da demanda só do próprio usuário, até 5 min);
   - o formulário volta zerado e o foco vai para a grade.
5. **"Avisar este cliente quando chegar"** (PV-09): uma linha opcional depois do motivo.
   - Ao tocar, abre uma gaveta com a busca de cliente pelo WhatsApp ou o cadastro mínimo (nome, WhatsApp e a caixa "O cliente autorizou o contato", **desmarcada por padrão**).
   - Sem autorização, não cria o interesse e explica o motivo.
6. **Faixa etária:** continua opcional, em chips, e no fim. Nunca peça a data de nascimento.
7. **Voz:** continua no topo. A transcrição preenche os chips, que ficam destacados para a pessoa conferir antes de registrar.

## Como testar

- **3 toques:** cronometre "calça 42 sem tamanho" no celular. Meta: menos de 10 s e 3 toques.
- **Vitest:** escolher um produto com variante de saldo 0 pré-seleciona o motivo.
- **Vitest:** "Desfazer" chama o `DELETE`.
- **320 px:** nada estoura; todos os alvos têm 44 px ou mais.
- **Acessibilidade:** cada chip é um `button` com `aria-pressed`, e a ordem do Tab segue a ordem visual.

## Pronto quando

- [ ] A procura mais comum leva 3 toques, com tempo medido e anotado no PR.
- [ ] Desfazer funciona por 5 s.
- [ ] Existe a opção "Avisar quando chegar", com consentimento explícito (quando a PV-09 estiver pronta).
- [ ] Funciona com uma mão em 375 px, nos temas claro e escuro.
