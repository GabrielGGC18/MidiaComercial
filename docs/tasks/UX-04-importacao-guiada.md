# UX-04 · Importação guiada em passos

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 6 h · **Depende de:** PV-02 (mapeamento de colunas); PV-03 e PV-04 para mostrar catálogo e correções

## Problema

A `ImportarPage.tsx` é uma tela única: o lojista escolhe o tipo, envia, vê a prévia e confirma. Faltam três coisas:

- **Formato:** não diz qual arquivo exportar do sistema dele, nem em que formato;
- **Colunas:** não deixa ajustar colunas (isso vem com a PV-02);
- **Resultado:** não mostra **o que mudou** depois de confirmar (vendas novas, correções, sugestões geradas).

A pesquisa apontou o preenchimento de dados como a maior dificuldade.

## Onde mexer

- `frontend/src/features/importacao/ImportarPage.tsx` (vira um assistente)
- `frontend/src/features/importacao/passos/` (novo): um componente por passo
- Backend: as rotas da PV-02 (`/colunas`, `/mapeamento/{tipo}`) e o resumo pós-confirmação (item 5)

## Passo a passo

1. **Indicador de passos no topo** (`aria-current="step"`):
   1. O que enviar
   2. Escolher arquivo
   3. Conferir colunas
   4. Conferir dados
   5. Pronto
2. **O que enviar:** cartões **Vendas**, **Estoque**, **Catálogo** e **Clientes**. Cada um tem:
   - uma frase ("Vendas: um relatório de itens vendidos, com número da venda e data");
   - um link "Baixar modelo";
   - um "Como exportar do meu sistema", com texto por sistema conhecido. Enquanto a PV-12 não registrar o sistema, deixe só o texto genérico.
3. **Conferir colunas** (PV-02):
   - tabela "Coluna do seu arquivo → O que significa", com um `select` por linha, já pré-preenchido pela sugestão;
   - linhas obrigatórias que faltam ficam em vermelho, com ícone e texto;
   - a caixa "Lembrar para os próximos envios" vem marcada;
   - mostre as 3 primeiras linhas do arquivo **só no navegador**, sem enviar.
4. **Conferir dados:** use a prévia atual, com números grandes:
   - "120 itens novos · 4 correções · 1 cancelamento · 3 com erro";
   - os erros aparecem em lista ("Linha 8: Data vazia"), com o botão **"Baixar só as linhas com erro"**. Gere o CSV no navegador a partir do arquivo original; nada sai do computador;
   - a conferência do total fica em linguagem simples, com o âmbar e o vermelho atuais.
5. **Pronto:** um resumo do que mudou na loja, com links:
   - "Estoque atualizado: agora de hoje, 9h";
   - "5 sugestões de pós-venda geradas → Revisar" (PV-07);
   - "12 vendas sem cliente → Ver pendências" (PV-05).

   **Backend:** inclua esses contadores no retorno do `confirmar` (`LoteOut`) ou num `GET /api/importacao/lotes/{id}/resumo`.
6. **Arrastar e soltar** com uma área grande. No celular, o botão "Escolher arquivo" continua funcionando.

## Como testar

- **Arquivo da demo** (PV-11), com cabeçalhos diferentes: mapear uma vez; no segundo envio, o passo 3 já vem certo.
- **Linhas com erro:** "Baixar só as linhas com erro" gera um CSV só com essas linhas.
- **Vitest:** a navegação entre passos e o bloqueio de "Próximo" quando falta uma coluna obrigatória.
- **Responsivo:** 375 e 1280 px.

## Pronto quando

- [ ] O assistente tem 5 passos, com o mapeamento lembrado.
- [ ] Os erros são explicados por linha e existe o download só das linhas com erro.
- [ ] A tela final mostra o que mudou, com links para a próxima ação.
- [ ] Os textos seguem a UX-02.
