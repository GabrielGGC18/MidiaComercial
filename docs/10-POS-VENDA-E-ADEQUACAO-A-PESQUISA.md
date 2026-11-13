# 10 · Adequação à pesquisa com lojistas: pós-venda, dados confiáveis e usabilidade

> **Data:** 13/11/2026 · **Base:** documento "Melhoria 2" da equipe, conferido contra o código da `main` (commit `1eacaff`).
> **Status:** proposta aprovada para execução. Nada daqui está implementado ainda. As tasks estão em [`docs/tasks/`](tasks/README.md), com prefixo **PV** (pós-venda e dados) e **UX** (usabilidade).

## 1. O que a pesquisa mudou

Nas visitas ao shopping, as franquias já tinham ferramentas parecidas. As **lojas menores** tinham três dificuldades:

1. preencher dados;
2. fazer pós-venda;
3. manter contato com o cliente.

**Foco:** a pequena loja de **moda e acessórios** que tem autonomia para testar e consegue exportar vendas, estoque e clientes por arquivo. Começamos com **uma loja piloto**.

**Limite honesto:** os relatos não medem o tamanho do mercado nem a frequência dos problemas. O ganho de vendas é **hipótese a medir** (seção 9), não promessa.

## 2. Problema e proposta de valor

- **Problema:** o lojista registra a venda ou ouve uma procura, mas não consegue transformar isso num retorno organizado ao cliente, com o produto certo.
- **Proposta:** o Mídia Comercial reaproveita os dados que a loja já tem e prepara **sugestões de retorno** com cliente, motivo, produto, estoque e mensagem. O vendedor revisa e envia.
- **O que validar:** menos trabalho para registrar e menos dúvida sobre "quem chamar e com qual produto".

## 3. O que o código já faz (conferido)

| Parte | Já faz | Lacuna encontrada |
| --- | --- | --- |
| `apps/importacao` | CSV de vendas e estoque, prévia, reconciliação e hash do arquivo | Itens que já existem viram "duplicados" já na **prévia** (`services.py:124`). Pedido e item usam `get_or_create` (`:226`, `:242`). Por isso, **correção e cancelamento posteriores são ignorados**. |
| `apps/importacao` | Cria produto e variante para SKU novo | `Variante` nasce **sem cor e sem tamanho** (`:209`). O produto vira `referencia = sku`, ou seja, um produto por SKU. |
| `apps/clientes` | Importa clientes com nomes alternativos de coluna (`ALIASES`, `services.py:39`); histórico via `Cliente.ref = Pedido.cliente_ref` | Um só código por cliente. Não há mapa "sistema de origem → código externo". |
| `apps/publico` | Demanda anônima (produto, motivo, cor, tamanho) | Não dá para avisar um cliente quando o item chegar. |
| `apps/agente/prospeccao.py` | Campanhas para produto parado ou categoria em queda; medição em 14 dias por categoria | Tamanho tirado do **sufixo do SKU** (`:47`), convenção que não vale para outro sistema. A mensagem diz **"separamos"** e **"no seu tamanho"** mesmo quando o tamanho do cliente é desconhecido (`:131`, `:157-159`). |
| `apps/agente/services.py` | Confirmar, rejeitar e marcar enviada; consentimento revalidado | Não registra o desfecho do contato (respondeu, recusou, comprou). |
| `apps/notificacoes/eventos.py` | Observer depois do commit | Não é fila durável: falha de observer só vai para o log. |
| Frontend | Telas por função técnica (Analisar / Agir / Dados) | A rotina do vendedor fica espalhada em 8 itens. O atendente não cai no Balcão. No celular, o menu de baixo não tem Balcão. |

## 4. Decisões

1. **Arquivo primeiro, conector depois.** A integração por CSV/XLSX é a primeira entrega real. O conector com PDV/ERP só vem depois de conhecer o sistema da loja piloto (PV-12).
2. **Fato ≠ hipótese.** Compra, produto, quantidade e data são **fatos importados**. Tamanho pessoal, cor preferida e consentimento têm **origem própria**; nunca são inferidos de uma compra. A sugestão do agente é **hipótese** e nunca vira preferência do cliente.
3. **Não unir clientes por nome parecido.** O vínculo é por código de origem (ou WhatsApp informado pela loja). Venda sem cliente continua valendo para a análise e gera pendência só quando alguma ação depende do vínculo.
4. **Recomendação por regra, sem treinar modelo.** Relações aprovadas pelo lojista (**semelhante** ou **complementar**) + estoque fresco + tamanho por categoria. O LLM só explica; não muda fato. O framework continua igual ([docs/09](09-DECISAO-FRAMEWORK-IA.md)).
5. **Reaproveitar o motor de propostas.** `PropostaAgente.Tipo.CONTATO` + `Campanha.gatilho` (`compra_recente` ou `reposicao`). Não criar outro fluxo de confirmação.
6. **Processamento idempotente.** Cada gatilho tem uma chave `loja + origem + registro + versão`. Reprocessar não cria proposta repetida.
7. **Mensagem honesta.** Sem "separamos" e sem "seu tamanho" quando isso não foi confirmado. Abrir o WhatsApp não prova envio nem entrega.
8. **Usabilidade é requisito, não acabamento.** O vendedor precisa terminar a rotina no celular, em poucos toques e com palavras de loja (seção 7).

## 5. Entrada de dados confiável (Prioridade 1)

- **Mapeamento de colunas salvo por loja** (PV-02): o lojista diz uma vez que "Cód. Venda" é `pedido_id`, e o sistema lembra.
- **Catálogo** (PV-03): referência do produto-pai, SKU, nome, categoria, **cor**, **tamanho**, preço e data. A prospecção passa a usar `Variante.tamanho`, não o sufixo do SKU.
- **Vínculo de cliente** (PV-05): `VinculoCliente(sistema_origem, codigo_externo → Cliente)`, mais um painel de vendas sem cliente.
- **Correção e cancelamento** (PV-04):

  | Caso | Efeito |
  | --- | --- |
  | Mesmo conteúdo | Nada muda |
  | Correção | Atualiza os campos permitidos e audita |
  | Cancelamento | Muda o status e invalida as propostas pendentes daquela compra |
  | Devolução | Só quando houver fonte; o modelo `Devolucao` existe, mas não tem importação |

## 6. Pós-venda (Prioridades 2 e 3)

**Compra recente → complemento (PV-06, PV-07).** Exemplo da demo:

1. A venda de um **boné preto** é importada.
2. A combinação aprovada "Bonés → Camisetas (complementar)" encontra camisetas com estoque fresco.
3. Sai uma proposta com até **3 opções**, motivo, saldo, idade do saldo e o que falta confirmar.

**Regras da primeira versão:**
- não repetir o item comprado;
- tamanho só por categoria conhecida (tamanho de boné não vale para camisa);
- cliente sem consentimento não entra;
- disponibilidade revalidada na confirmação.

**Procura → retorno (PV-09).** O balcão continua anônimo por padrão. O botão **"Avisar este cliente quando chegar"** cria um `InteresseProduto`:
- cliente, item ou combinação produto/cor/tamanho, consentimento;
- estado: aguardando, contatado, concluído, cancelado ou expirado.

Quando o estoque importado mostrar saldo, sai uma proposta de **reposição**. A mensagem confirma o interesse; nunca promete reserva.

## 7. Usabilidade para o usuário final

Quem usa é o **vendedor no balcão** (celular, uma mão, cliente na frente) e o **gerente/dono** no fim do dia. Princípios:

1. **A rotina manda no menu.** Três entradas fixas:
   - **Registrar procura**;
   - **Revisar sugestões**;
   - **Acompanhar retornos**.

   A análise (público, oportunidades) vira uma seção secundária (UX-01).
2. **Cada papel abre na sua tela.** O atendente abre no Balcão; o gerente, em "Hoje" (UX-01).
3. **Palavras de loja.** "Campanha" vira "Lista de contatos", "Prospecção" vira "Buscar clientes para oferecer" e `cliente_ref` vira "código do cliente" (UX-02).
4. **Balcão em até 3 toques**, com chips de tamanho e cor, últimos produtos e voz (UX-03).
5. **Importação guiada** em passos, com erro explicado por linha e "o que mudou" ao final (UX-04).
6. **Nada de tela vazia muda.** Todo estado vazio diz o próximo passo; o primeiro uso tem uma lista de configuração (UX-05).
7. **Medir com gente de verdade:** teste com o lojista piloto cronometrando 5 tarefas (UX-06).

## 8. Ordem de entrega

| Etapa | Entrega | Tasks | Pronto quando |
| --- | --- | --- | --- |
| 0 | Bloqueios atuais + mensagem honesta | P1-01, P1-08, P1-02, P3-01, **PV-01** | Projeto sobe, sair funciona, mensagem não promete o que não sabe |
| 1 | Contrato da loja e catálogo | PV-02, PV-03, PV-05, UX-04 | Venda, cliente, SKU, cor e tamanho ligados; faltas visíveis |
| 2 | Atualização sem duplicar | PV-04 | Reenvio não duplica; correção e cancelamento dão o estado certo |
| 3 | Recomendação por compra | PV-06, PV-07, PV-08, UX-01, UX-02 | Compra válida gera proposta revisável com produto real |
| 4 | Procura → retorno | PV-09, UX-03 | Procura vinculada gera retorno quando o item chega |
| 5 | Desfecho e medição | PV-10, UX-05, UX-06 | Equipe registra o desfecho e vê os indicadores |
| 6 | Primeiro conector | PV-12 | Acesso ao sistema confirmado; falha pode ser reprocessada |

**Corte do hackathon:** etapas 0 a 3 com **um cenário completo** (PV-11). A etapa 4 entra se houver tempo. A etapa 6 depende da loja.

## 9. Indicadores do piloto

| Indicador | Mostra |
| --- | --- |
| Tempo para registrar e preparar o retorno | Esforço operacional |
| % de vendas com cliente vinculado | Cobertura para pós-venda individual |
| Campos aproveitados × pendências corrigidas | Utilidade da importação |
| Sugestões aprovadas/rejeitadas, com motivo | Relevância percebida |
| Retornos feitos e respostas registradas | Uso real |
| Compras depois do contato (produto e categoria) | **Associação**, nunca causalidade automática |

## 10. Critérios de aceitação (viram testes na PV-11)

- Reimportar o mesmo pedido não duplica compra, histórico nem proposta.
- Corrigir ou cancelar uma venda atualiza o estado e trata as propostas pendentes.
- Venda sem cliente identificado não é ligada a ninguém por suposição.
- Uma loja não vê clientes, interesses nem propostas de outra (404).
- Produto sem saldo, ou com saldo mais velho que `b_max_horas_estoque`, não aparece como disponível.
- Tamanho desconhecido não aparece como "seu tamanho".
- Cliente sem consentimento não recebe proposta de envio.
- Interesse cancelado, atendido ou expirado não gera retorno.
- Abrir o WhatsApp não conta como envio confirmado.
- A conversão é ligada ao item ou à categoria realmente acompanhada.

## 11. Demonstração

1. Importar a venda do boné preto (arquivo fictício) e mostrar o vínculo com o cliente.
2. Mostrar o cartão com a camiseta complementar, o motivo, o saldo e a mensagem.
3. Reimportar o arquivo: nada duplica.
4. Mostrar um caso com o tamanho ausente, que vira pendência em vez de suposição.

Dizer em voz alta: **"a entrada demonstrada é por arquivo; dados fictícios"**.
