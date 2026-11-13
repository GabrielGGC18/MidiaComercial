# PV-12 · Levantamento do sistema da loja piloto (antes de qualquer conector)

**Dono:** Gabriel + quem fez as visitas · **Prioridade:** P3 (depois do hackathon) · **Estimativa:** 1 visita + 2 h de registro · **Depende de:** loja piloto definida

## Problema

A conexão automática com um PDV ou ERP **não pode ser prometida** sem conhecer o sistema da loja. A importação por arquivo (PV-02 a PV-04) é a entrega concreta. Esta task só levanta o que é preciso para decidir o primeiro conector.

## Passo a passo

1. **Levantar com a loja** (sem pedir senha por mensagem):
   - nome e versão do sistema; se é na nuvem ou local;
   - como exporta: CSV/XLSX manual, relatório agendado, API (com documentação?), webhook;
   - campos disponíveis de venda, item, cliente (código), estoque e catálogo (cor, tamanho);
   - com que frequência dá para exportar; quem faz.
2. **Registrar** em `docs/integracoes/<sistema>.md`, **sem credencial, sem URL interna e sem dado de cliente**. Credenciais ficam só no `.env` da VPS.
3. **Decidir** entre três caminhos:
   - continuar por arquivo (com o mapeamento da PV-02);
   - exportação agendada para uma pasta;
   - API.

   **Se o caminho for API:** crie `apps/integracoes` com:
   - adaptador por sistema;
   - estado da sincronização;
   - registro de recebimento, sucesso, falha e tentativas;
   - **fila durável** (tabela de trabalhos pendentes) antes de depender da sincronização, porque o barramento atual não repete falhas.

## Pronto quando

- [ ] O documento do sistema da loja piloto está escrito, sem segredo.
- [ ] A decisão de conector está registrada como ADR curta (no mesmo formato do docs/09).
