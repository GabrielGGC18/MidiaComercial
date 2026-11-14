# 09 · Decisão: framework de IA para o agente (LangChain, LangGraph ou SDK direto)

> **Status:** decidido em 13/11/2026 · **Decisão:** não adotar LangChain nem LangGraph agora. Manter o SDK oficial da Anthropic atrás de um contrato de provedor próprio, com o provedor offline como padrão.

## 1. A pergunta

LangChain e LangGraph são da mesma organização, mas resolvem problemas diferentes:

| | **LangChain** | **LangGraph** |
| --- | --- | --- |
| O que é | Biblioteca de **componentes**: interface comum para vários LLMs, prompts, ferramentas, *retrievers* (RAG), *parsers* | Orquestrador de **grafos com estado**: nós, arestas, ciclos, *checkpoint* e *interrupt* (pausa para humano) |
| Brilha quando | Você troca muito de provedor, faz RAG sobre documentos ou monta *pipelines* com muitos passos | O fluxo tem vários agentes, ramificações, laços longos e pausas que duram horas ou dias |
| Custo | Muitas abstrações e dependências; a API muda com frequência | Mais um runtime para operar, depurar e testar; o estado vive fora do seu banco |

Precisamos de algum dos dois?

## 2. O que o agente do MidiaComercial faz de fato

- **Um** agente, com **6 ferramentas** filtradas por papel (`buscar_variante`, `propor_demanda`, `propor_cliente`, `buscar_clientes`, `prospectar_produtos_em_baixa`, `resumo_publico`).
- Laço curto: entrada → o modelo escolhe ferramenta → validamos → executamos → auditamos → resposta. Teto de 6 passos.
- **A pausa para a pessoa confirmar não é estado em memória**: é uma `PropostaAgente` pendente no banco. Ela sobrevive a reinício do servidor e a troca de aparelho, e passa pelo mesmo service do formulário em `confirmar()`.
- **Offline primeiro**: o provedor padrão é um intérprete determinístico em português. A demo e o balcão funcionam sem internet e sem chave.
- Sem RAG: os dados são da própria loja, já estruturados no Postgres e lidos por ferramentas com `.da_loja()`.

## 3. O que cada framework traria, e o que já temos

| Recurso do framework | Onde já está no projeto |
| --- | --- |
| Interface comum de LLM (LangChain `BaseChatModel`) | `apps/agente/provedores/__init__.py` (`Provedor`, `Uso`). Trocar de LLM = uma classe nova |
| Ferramentas com schema (LangChain `@tool`) | `@ferramenta(nome, descricao, papel_minimo, parametros)` + `validar_args()` (JSON Schema, sem dependência) |
| Grafo/laço do agente (LangGraph `StateGraph`) | `orquestrador.processar()`: limite de passos, papel, loja, auditoria e *fallback* |
| *Interrupt* para humano (LangGraph) | `PropostaAgente` pendente → `confirmar()` / `rejeitar()` |
| *Checkpointer* / memória | `SessaoAgente.historico` (só texto mascarado, últimas 6 falas) + `sessao_id` na API |
| Rastreamento (LangSmith) | `ChamadaFerramenta` (cada ferramenta, entrada mascarada, duração) + tokens, passos e *fallback* em `SessaoAgente` + `GET /api/agente/uso` |
| *Fallback* entre modelos | Falha no Claude → as propostas pela metade são apagadas → refaz no offline |

## 4. Por que não adotar agora

1. **Privacidade é regra P0.** O mascaramento (`mascarar`/`restaurar`/`ocultar`) e a regra "cadastro de cliente nunca vai ao LLM" ficam num lugar só, auditável. Com o framework no meio, mais uma camada mexe nos prompts e nas saídas das ferramentas.
2. **O estado já é do Django.** Propostas, sessões e auditoria são modelos com `loja` e `.da_loja()`. Um *checkpointer* externo duplicaria esse estado fora do isolamento multi-loja.
3. **O provedor offline não é um LLM.** Ele quase não aproveitaria as abstrações do framework, e é ele que roda na demo.
4. **Tamanho do problema.** O laço de tool use tem cerca de 40 linhas (`provedores/claude.py`) e é coberto por testes com um cliente falso, sem rede.
5. **Risco de hackathon.** São menos dependências, menos quebra de versão e um *build* Docker menor.

## 5. Quando revisitar (gatilhos objetivos)

Vamos reabrir esta decisão se **dois ou mais** destes casos acontecerem:

- Surgir mais de um agente cooperando (ex.: um agente de compras que conversa com o de prospecção).
- Surgirem fluxos com ramificação e pausas longas, que não se resolvem como "proposta pendente".
- Precisarmos de RAG sobre documentos (manuais, catálogos de fornecedor em PDF).
- Precisarmos suportar 3 ou mais provedores de LLM em produção.

Se acontecer, o candidato é o **LangGraph**, que resolve orquestração e estado. O LangChain inteiro não seria necessário. A migração seria localizada: `orquestrador.py` vira o grafo, cada ferramenta vira um nó, e `PropostaAgente` continua sendo o *interrupt*.

## 6. Modelo de LLM

- Padrão: **`claude-haiku-4-5`** (`MIDIA_IA_MODELO`). O trabalho é escolher a ferramenta e preencher campos curtos. Ele é rápido e barato, o que importa no balcão.
- Para frases mais difíceis, basta trocar a variável de ambiente para um modelo maior. Não há mudança de código.
- *Prompt caching*: as regras fixas e as ferramentas ficam em cache; o vocabulário da loja (categorias, tamanhos, cores, sem dado pessoal) vai num bloco à parte.
- Timeout de 20 s (`MIDIA_IA_TIMEOUT`) e 1 *retry*. Depois disso, o offline assume.

## 7. Garantias testadas (`apps/agente/tests/test_provedor_claude.py`)

- O laço completo de tool use cria propostas, conta tokens (inclusive os de cache) e envia o contexto da loja.
- Um argumento inválido volta ao modelo como erro, e ele corrige a chamada.
- Uma falha no meio cai no offline **sem deixar proposta órfã**.
- A memória curta continua a conversa; a sessão de outra pessoa ou de outra loja dá 404.
- Telefone vai ao LLM só como `[TELEFONE_1]`; cadastro de cliente não entra na memória lida pelo LLM.
- `/api/agente/uso` só para gerente ou dono.

## 8. Avaliação com frases reais de balcão (P2-03)

`apps/agente/tests/frases_balcao.json`: 53 frases, incluindo gíria, voz transcrita sem pontuação, número e
idade por extenso, diminutivo e frases que **não** são de balcão ("bom dia", "quanto vendemos ontem?").
`python manage.py avaliar_agente [--provedor offline|hermes|claude]` mede por campo sem gravar nada.

Resultado do offline (13/11/2026):

| Campo | Acerto |
| --- | --- |
| Frases inteiras certas | 47/53 |
| ferramenta | 53/53 (100%) |
| produto (`sku_produto`) | 38/38 (100%) |
| motivo | 35/36 (97%) |
| faixa etária | 11/12 (92%) |
| cor | 21/23 (91%) |
| tamanho | 28/31 (90%) |

As 6 frases que falham estão marcadas como `conhecida_falha` (xfail estrito): tamanho por extenso ("grande",
"médio", "pequena"), cor e produto no plural e "senhorzinho". Oito frases novas foram escritas **sem** ajustar o
parser a elas, para o número não ser inflado. A avaliação já pegou bugs reais: "cara" não era preço, o produto
não era achado com palavras antes dele e cumprimentos viravam registro de procura.

O número do Hermes sai rodando o comando na VPS (`--provedor hermes`); cada frase leva de 6 a 20 s.

