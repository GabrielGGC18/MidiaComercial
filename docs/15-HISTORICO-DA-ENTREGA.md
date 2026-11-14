# 15. Histórico da entrega

O que foi feito, em ordem, e por quê. Detalhes técnicos nos documentos indicados.

## 1. Planejamento e documentação inicial

- Proposta, telas, linguagem, arquitetura, tecnologias e tecnologia sorteada ([01](01-PROPOSTA-E-ESTRUTURA-DAS-TELAS.md)–[06](06-TECNOLOGIA-SORTEADA.md)).
- Evolução para público, voz, base de clientes e agente de vendas ([07](07-EVOLUCAO-AGENTE-PUBLICO.md)).
- Design com geometria reta e efeitos inspirados no React Bits ([08](08-DESIGN-GEOMETRIA-E-EFEITOS-REACT-BITS.md)).
- Decisão de não usar LangChain/LangGraph: SDK direto atrás de um contrato próprio ([09](09-DECISAO-FRAMEWORK-IA.md)).
- Adequação à pesquisa com lojistas: pós-venda e usabilidade ([10](10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md)).
- README reposicionado: o problema é do **lojista do shopping**, com a tabela "o desafio pede × como respondemos".

## 2. Página inicial e telas

- `/login` virou página institucional: o que somos e quem somos **antes** do login, prints das telas,
  explicação das funções, fotos (créditos em `frontend/public/fotos/CREDITOS.md`) e cartões que alternam.
- Logo animado em forma de gráfico crescente, com alternâncias.
- Efeitos só em CSS (sem WebGL), com versão estática para quem pede menos movimento.
- Correções mantendo o layout: gradiente em texto animado no Chrome, quebras no celular, descendentes cortados,
  rolagem indevida por `autoFocus`.
- Texto principal objetivo: o que a ferramenta cruza e o que entrega.

## 3. Agente e IA

- Provedor **Hermes**: GPT pelo OAuth já existente na VPS, sem chave na aplicação. Ponte local por socket unix,
  wrapper com sudo restrito, protocolo JSON por rodadas ([13 §4.1](13-AGENTE.md#41-hermes-em-produção)).
- Estrutura: prompt comum em `provedores/prompts.py` (nenhum provedor depende de outro), escolha por tabela
  (`FABRICAS`) com queda para o offline em qualquer falha, `/api/agente/uso` contando Hermes como LLM.
- Telemetria por sessão: provedor, modelo, passos, tokens, duração e motivo de fallback.

## 4. Segurança

Três rodadas de revisão do rate limit:

| Problema encontrado | Correção |
| --- | --- |
| Bloqueio por conta deixava qualquer um trancar a conta alheia | Falhas contadas por usuário + IP |
| `X-Forwarded-For` forjável escapava do limite | IP só do segredo da Vercel ou de proxy confiável |
| `X-Real-IP` aceito de qualquer origem | Lista `MIDIA_PROXIES_CONFIAVEIS` |
| Força bruta distribuída por vários IPs | Limite global por conta (exceto demo, cuja senha é pública) |
| Limite global pode trancar o dono | Aviso no log + `manage.py desbloquear_login` |

Repositório público: gitleaks (pre-commit e CI), bloqueio de arquivos sensíveis, nada de IP/segredo em docs.

## 5. Infraestrutura

- Imagem Docker de produção (sem deps de dev, não-root), compose para a VPS com `db`, `web` e `prazos`.
- API publicada na VPS compartilhada sem afetar os vizinhos: usuário, pasta, rede, volume, porta e site nginx
  próprios; TLS pelo certbot.
- Front na Vercel com middleware que faz o proxy da API na mesma origem.
- Erros do proxy tratados: `API_ORIGEM` tolerante a formatos colados e mensagem amigável ao visitante, com o
  detalhe técnico só no log.

## 6. CI/CD

- CI recuperado: o ruff sem versão fixa passou a formatar Markdown e derrubava o job do backend antes do pytest.
  Versão fixada e formatador restrito a Python.
- CD da API: timer na VPS publica a `main` só com CI verde, com rollback automático
  ([14 §5](14-DEPLOY-E-OPERACAO.md#5-cd-da-api-timer-na-vps)).

## 7. Backend de oportunidades, agente e base de produção (13–14/11)

- **Oportunidades** ([docs/18](18-BACKEND-DE-OPORTUNIDADES.md)): o GET só lê; as análises são imutáveis;
  recalcular com os mesmos dados devolve a mesma análise; a publicação é curta e travada por loja, com o LLM fora
  da transação; campos estruturados da decisão; "Lembrar depois"; uma ação aberta por alvo.
- **Agente:** histórico de conversas (até 100 falas guardadas, 6 ao LLM); escolha de provedor por tabela com
  queda para o offline; retenção LGPD diária; confirmação travada (sem registro duplicado); mensagem de contato
  sem promessa (PV-01); frases que não são de balcão não viram registro.
- **Avaliação do agente:** 53 frases e o comando `avaliar_agente`. Offline 47/53, Hermes 25/53 (docs/09 §8).
- **Telas:** detalhe da oportunidade com a decisão primeiro (UX-07); clientes paginados (P1-06).
- **Produção:** o dev sobe sem `.env`; a produção recusa chave de dev; saúde com 503; HTTPS forçado, HSTS e
  sessão de 12 h; correção do limiar `Decimal` em loja nova.
- **Proxy da Vercel:** `API_SEGREDO` e `API_ORIGEM` tolerantes a valor colado; `API_ORIGEM` apontando para a
  própria Vercel vira "em manutenção" com o motivo no log, em vez de `NOT_FOUND`.

## 8. Fluxo de entrega e documentação técnica (14/11)

- **Branches:** `feat/… → develop → main`. A `develop` só integra (CI); a `main` é a produção. O CI recusa PR
  para a `main` que não venha da `develop` ou de `hotfix/…`. Checklist obrigatório antes da `main`
  ([docs/14 §0](14-DEPLOY-E-OPERACAO.md#0-fluxo-de-branches)).
- **Ambiente de teste:** chegou a ser montado na VPS (projeto separado, porta própria) e foi **removido** por
  decisão da equipe. O compose ainda aceita `MC_PROJETO`/`MC_PORTA` se um dia for preciso.
- **Docs técnicas:** [docs/tecnico/](tecnico/README.md), com seis guias e a referência gerada do código
  (`manage.py gerar_referencia`: 55 rotas com o papel mínimo, modelos, comandos e settings).
- **Acompanhamento:** milestones e issues no GitHub (#15 a #27).

## 9. Pendências conhecidas

| Pendência | Issue |
| --- | --- |
| Rate limit pelo site não bloqueia: conferir o `API_SEGREDO` de Production na Vercel | [#20](https://github.com/GabrielGGC18/MidiaComercial/issues/20) |
| Balcão no offline e Hermes só para perguntas abertas; prompt do Hermes | [#16](https://github.com/GabrielGGC18/MidiaComercial/issues/16), [#17](https://github.com/GabrielGGC18/MidiaComercial/issues/17) |
| Tempo de resposta do Hermes (17–34 s) | [#18](https://github.com/GabrielGGC18/MidiaComercial/issues/18) |
| Ferramentas de vendas, oportunidades e ações no agente | [#19](https://github.com/GabrielGGC18/MidiaComercial/issues/19) |
| Backup agendado do banco | [#21](https://github.com/GabrielGGC18/MidiaComercial/issues/21) |
| Chat com histórico (P3-04) · tela do dono (P2-05) · layout e rotina (P3, UX) | [#22](https://github.com/GabrielGGC18/MidiaComercial/issues/22), [#23](https://github.com/GabrielGGC18/MidiaComercial/issues/23), [#24](https://github.com/GabrielGGC18/MidiaComercial/issues/24) |
| Importação fiel ao sistema da loja · pós-venda · conector da loja piloto | [#25](https://github.com/GabrielGGC18/MidiaComercial/issues/25), [#26](https://github.com/GabrielGGC18/MidiaComercial/issues/26), [#27](https://github.com/GabrielGGC18/MidiaComercial/issues/27) |
| O Hermes não informa tokens: `/api/agente/uso` conta conversas, não custo | — |
