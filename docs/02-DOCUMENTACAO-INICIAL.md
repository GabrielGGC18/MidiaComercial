# 02. Documentação inicial do projeto

**Projeto:** MidiaComercial
**Entrega:** Hackrun, primeira entrega (planejamento e definição técnica). Não é a entrega final do MVP.
**Data:** 13/11/2026

---

## 1. Visão geral

**MidiaComercial** é uma camada leve de inteligência comercial para pequenos lojistas independentes de moda e acessórios. Ela fica **ao lado** do PDV ou ERP que a loja já usa, sem substituí-lo, e junta três sinais que normalmente ficam espalhados:

| Sinal | De onde vem |
| --- | --- |
| **O que vendeu** | CSV exportado do caixa/ERP |
| **O que procuraram e não tinha** | Registro rápido no balcão (ou pelo agente de IA) |
| **O que tem no estoque** | CSV de saldo por variante |

A partir disso, entrega **até 3 oportunidades priorizadas**, cada uma com evidência, amostra e limitação, e acompanha a ação que o lojista decidir testar.

> **Assinatura:** *Seus sinais de venda, em uma só mídia.*
> **Diferencial:** observar compras **e não compras**, decidir e medir.

## 2. Problema

> O pequeno lojista tem sinais dispersos sobre o que vende e sobre o que o cliente procura, mas não tem uma rotina simples para transformar esses sinais em decisões que possam ser verificadas.

Pontos de dor que o projeto investiga:

- O caixa mostra só o que **foi vendido**; o que o cliente **procurou e não encontrou** se perde.
- Relatórios prontos (curva ABC, vendas por categoria) já existem em ERPs, mas não viram uma **decisão semanal**.
- Recomendações sem evidência geram desconfiança; o lojista precisa ver **por que** algo é sugerido.

## 3. Proposta de valor

1. **Importa** vendas e estoque por CSV, com prévia, erros por linha e reconciliação de totais.
2. **Registra** a demanda não atendida em até 20 segundos.
3. **Calcula** métricas e aplica regras determinísticas e explicáveis.
4. **Mostra** no máximo 3 oportunidades, com evidência e limitação sempre visíveis.
5. **Acompanha** a ação: responsável, prazo, indicador e medição antes/depois.
6. **Ajuda a preencher dados** com um agente de IA que propõe registros para a pessoa confirmar.

## 4. Escopo do MVP

### 4.1 Dentro (P0)

| # | Entrega | Critério de aceite |
| --- | --- | --- |
| P0-1 | Login e separação por loja | Usuário da loja A não acessa dados da loja B, nem trocando IDs |
| P0-2 | Importação de CSV | Prévia, erros por linha, reconciliação, reimportação sem duplicar |
| P0-3 | Meu público | Categorias, ticket, dia/horário; recorrência só com cobertura exibida |
| P0-4 | Demanda não atendida | Registro em ≤ 20 s e ≤ 4 toques no celular |
| P0-5 | Motor de oportunidades | Regras A, B e C; no máximo 3 cartões com evidência e limitação |
| P0-6 | Plano de ação | Criar, concluir ou descartar com indicador e medição |
| P0-7 | Explicação | Texto por template sempre disponível; IA opcional sem alterar números |
| P0-8 | Demo reproduzível | Seed sintético de 90 dias, 2 lojas, sem depender de serviço externo |

### 4.2 Evolução (P1)

Agente de IA com LLM real, mapeamento de planilhas fora do padrão, cesta de produtos complementares, calendário de eventos da loja.

### 4.3 Fora do MVP

Integração com ERPs, disparo de campanhas, previsão de vendas, precificação automática, app nativo, câmeras, reconhecimento facial, mapa de concorrentes, comparação entre lojas.

## 5. Personas

| Persona | Contexto | O que precisa |
| --- | --- | --- |
| **Dono(a) da loja** | Decide compras e promoções; pouco tempo para planilhas | Saber o que fazer esta semana e se funcionou |
| **Gerente** | Organiza estoque, equipe e relatórios | Importar dados com segurança e acompanhar ações |
| **Atendente** | No balcão, atendendo; usa o celular | Registrar o que faltou sem atrapalhar o atendimento |

**Loja de referência (fictícia):** Loja Demo Centro, moda masculina em Palmas (TO). Uma segunda loja, Loja Demo Norte, serve para demonstrar o isolamento de dados.

## 6. Histórias de usuário

1. Como **dono**, quero ver as 3 oportunidades mais importantes da semana para decidir onde agir.
2. Como **gerente**, quero importar o CSV de vendas e ver os erros antes de gravar.
3. Como **atendente**, quero registrar o tamanho que faltou em poucos toques para que a procura conte nas compras.
4. Como **gerente**, quero ver por que uma ação foi sugerida para decidir com confiança.
5. Como **dono**, quero acompanhar a ação escolhida para decidir se mantenho, ajusto ou abandono.
6. Como **atendente**, quero escrever "procurou camiseta azul M e não tinha" e só confirmar o registro.

## 7. Regras de negócio principais

| Regra | Dispara quando | Sugere | Bloqueia quando |
| --- | --- | --- | --- |
| **A: Lacuna de mix** | ≥ N procuras de uma variante na janela e saldo 0 ou ausente | Conferir estoque físico e consultar fornecedor | Não há registros de demanda |
| **B: Estoque parado** | Saldo > 0 e nenhuma venda em X dias | Checar cadastro, exposição e sazonalidade | Estoque desatualizado há mais de H horas |
| **C: Padrão de público** | Concentração de categoria × horário ou mudança de recorrência | Teste de exposição ou atendimento | Cobertura de cliente identificado abaixo do mínimo |

Limiares configuráveis por loja (`ConfiguracaoLoja`). Status sempre descritivo: **dados suficientes**, **amostra limitada** ou **cálculo bloqueado**, nunca uma porcentagem de confiança.

## 8. Dados

### 8.1 Entidades principais

`Loja` · `Vinculo` (usuário + loja + papel) · `ConfiguracaoLoja` · `Produto` · `Variante` · `Pedido` · `ItemPedido` · `Devolucao` · `SnapshotEstoque` · `DemandaNaoAtendida` · `LoteImportacao` · `LinhaRejeitada` · `ExecucaoMotor` · `Oportunidade` · `Evidencia` · `PlanoAcao` · `Medicao` · `EventoAuditoria` · `PropostaAgente`.

Detalhes e diagrama em [`04-ARQUITETURA-PROPOSTA.md`](04-ARQUITETURA-PROPOSTA.md).

### 8.2 Contrato do CSV de vendas

Uma linha por item de pedido, separador `;`, UTF-8.

| Coluna | Obrigatória | Regra |
| --- | --- | --- |
| `pedido_id`, `item_id` | ✅ | Par único por loja e origem (reimportar não duplica) |
| `data_hora` | ✅ | ISO 8601 com fuso |
| `sku`, `categoria` | ✅ | Uma variante por SKU (M ≠ G) |
| `quantidade` | ✅ | Inteiro > 0 |
| `receita_item` | ✅ | Decimal com 2 casas, já com desconto |
| `status` | ✅ | `concluida` ou `cancelada` |
| `cliente_ref` | ⬜ | Código opaco; **nunca** CPF, nome ou telefone |

```csv
pedido_id;item_id;data_hora;sku;categoria;quantidade;receita_item;status;cliente_ref
V001;1;2026-11-01T10:20:00-03:00;CAM-AZ-M;Camisetas;2;119.80;concluida;C017
V001;2;2026-11-01T10:20:00-03:00;CIN-PR-U;Cintos;1;39.90;concluida;C017
```

## 9. API (resumo)

Documentação interativa em `/api/docs` (gerada pelo Django Ninja).

| Grupo | Rotas |
| --- | --- |
| Sessão | `GET /api/csrf` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/me` |
| Importação | `POST /api/importacoes/preview` · `POST /api/importacoes/{id}/confirmar` |
| Análises | `GET /api/analises/publico` |
| Demandas | `POST /api/demandas` · `GET /api/demandas/ranking` |
| Oportunidades | `POST /api/oportunidades/gerar` · `GET /api/oportunidades` |
| Ações | `POST /api/acoes` · `PATCH /api/acoes/{id}` · `POST /api/acoes/{id}/medicoes` |
| Agente de IA | `POST /api/agente/mensagens` · `POST /api/agente/propostas/{id}/confirmar` |

## 10. Segurança e privacidade

- **Isolamento por loja:** a loja vem da sessão, validada contra o vínculo do usuário; um ID de outra loja retorna 404.
- **Papéis:** atendente registra demanda; gerente importa, analisa e cria ações; dono também gerencia usuários.
- **LGPD:** demo com dados 100% sintéticos; sem CPF, nome ou telefone no núcleo analítico; nenhum dado pessoal enviado a IA externa.
- **Agente de IA:** propõe, nunca grava sozinho; mascara dados pessoais; registra tudo em auditoria.

## 11. Como rodar (planejado)

```bash
git clone https://github.com/<org>/midiacomercial.git
cd midiacomercial
cp .env.example .env
docker compose up --build
docker compose exec web python manage.py seed_demo
# Frontend: http://localhost:5173 · API: http://localhost:8000/api/docs
```

| Usuário demo | Loja | Papel |
| --- | --- | --- |
| `dono.centro` | Loja Demo Centro | dono |
| `gerente.centro` | Loja Demo Centro | gerente |
| `ana` | Loja Demo Centro | atendente |
| `gerente.norte` | Loja Demo Norte | gerente |

Senha de demonstração: `demo1234`.

## 12. Organização do repositório

```
midiacomercial/
├── README.md
├── docs/                 ← esta documentação de entrega
├── apps/                 ← apps Django por domínio
├── config/               ← settings, urls, API Ninja
├── frontend/             ← SPA React (Vite + TypeScript)
├── scripts/              ← seed e CSVs de demonstração
├── Dockerfile · docker-compose.yml · docker-compose.prod.yml · Caddyfile
└── pyproject.toml
```

## 13. Convenções da equipe

- **Branches:** `main` sempre demonstrável; trabalho em `feat/<area>-<tarefa>`; PR pequeno revisado por outra pessoa.
- **Commits:** `feat:`, `fix:`, `test:`, `docs:`, `chore:`.
- **Qualidade:** Ruff (Python) e ESLint (TypeScript) no pre-commit e no CI.
- **Testes:** toda regra nova vem com três cenários: dispara, não dispara e bloqueada.

## 14. Equipe e papéis

| Papel | Responsabilidade |
| --- | --- |
| Produto e UX | Escopo, telas, textos, roteiro da demo e pitch |
| Backend | Django, autenticação, importação, ações, API e deploy |
| Dados e inteligência | Contrato do CSV, seed, métricas, regras e agente |
| Frontend | React, design system Mídia UI, telas e gráficos |

## 15. Riscos principais

| Risco | Mitigação |
| --- | --- |
| Escopo crescer | P0 congelado; novidades vão para P1 |
| Vazamento entre lojas | Escopo por loja em toda query + teste obrigatório |
| Dados mockados "perfeitos demais" | Seed com cancelamentos, devoluções, dias fechados e estoque desatualizado |
| Internet ou IA falhar na apresentação | Explicação por template, agente em modo offline, demo local com Docker |
| "Isso o ERP já faz" | Foco em demanda não atendida + ciclo de ação, não em relatórios |

## 16. Documentos relacionados

- [01. Proposta e estrutura das telas](01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md)
- [03. Linguagem de programação](03-LINGUAGEM-DE-PROGRAMACAO.md)
- [04. Arquitetura proposta](04-ARQUITETURA-PROPOSTA.md)
- [05. Plataforma e tecnologias](05-PLATAFORMA-E-TECNOLOGIAS.md)
- [06. Tecnologia ou prática sorteada](06-TECNOLOGIA-SORTEADA.md)
