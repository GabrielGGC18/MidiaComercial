# UX-05 · Primeiro uso guiado e estados vazios que dizem o próximo passo

**Dono:** Pessoa 2 · **Prioridade:** P2 · **Estimativa:** 4 h · **Depende de:** UX-01 (tela Hoje)

## Problema

- **Loja nova vazia:** quem entra numa loja nova (sem o seed) vê telas vazias e não sabe por onde começar.
- **Estados vazios genéricos:** existem, mas vários só dizem "Nenhum…" (ex.: `AgentePage.tsx`: "Nenhuma campanha aberta").
- **Texto de demo:** `ImportarPage.tsx` mostra "Os dados da demo foram gerados pelo seed (90 dias)", que não faz sentido para o lojista real.

## Onde mexer

- `frontend/src/features/hoje/PrimeiroUso.tsx` (novo), dentro do Hoje
- Os componentes de estado vazio de cada tela (procure por `titulo="Nenhum` e textos parecidos)
- Backend: `GET /api/loja/progresso` (gerente+). Devolve booleans e contagens; nada de dado pessoal.

## Passo a passo

1. **Lista de configuração** no Hoje, enquanto não estiver completa:

   | Item | Fica completo quando |
   | --- | --- |
   | Enviar o catálogo | existe uma variante com cor ou tamanho |
   | Enviar as vendas | existe um pedido |
   | Enviar o estoque | existe um snapshot de estoque recente |
   | Enviar os clientes (com autorização) | existe um cliente com consentimento |
   | Dizer o que combina com o quê | existe uma `RelacaoProduto` ativa |
   | Registrar a 1ª procura no balcão | existe uma demanda |

   - Mostre a barra "4 de 6"; cada item é um link para a tela certa.
   - Pode ser dispensada ("Ocultar"), mas volta se algo ficar desatualizado (ex.: estoque velho).
2. **Padrão de estado vazio:** ícone + o que é + por que está vazio + **uma** ação.
   ```tsx
   <EstadoVazio
     titulo="Nenhuma sugestão agora"
     motivo="Elas aparecem quando você envia vendas de clientes que autorizaram contato."
     acao={{ rotulo: "Enviar vendas", para: "/importar" }}
   />
   ```
   Aplique em: Sugestões, Retornos, Clientes, Combinações, Oportunidades, Plano de ação e Procuraram e não tinha.
3. **Textos de demo:** só aparecem quando a loja é de demonstração. Use o campo `Loja.demo` (já existe em `apps/contas/models.py`; o seed marca `True`).
4. **Ajuda curta:** um botão "?" no cabeçalho de cada tela da rotina, com uma explicação de 2 ou 3 frases num `Popover`. Nada de tour obrigatório.

## Como testar

- **Loja nova:** o Hoje mostra a lista de configuração com 0 de 6. Cada link leva à tela certa.
- **Loja do seed:** a lista não aparece (ou aparece completa e dispensável).
- **Vitest:** o `EstadoVazio` renderiza a ação e o motivo.

## Pronto quando

- [ ] A lista de configuração funciona, ligada ao endpoint de progresso.
- [ ] Os 7 estados vazios seguem o padrão novo.
- [ ] Os textos de demo ficam escondidos na loja real.
