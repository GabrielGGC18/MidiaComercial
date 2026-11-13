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

## 7. Pendências conhecidas

- Backup agendado do banco (`pg_dump`) na VPS.
- `ConfiguracaoLoja.c_min_cobertura_cliente` com padrão em texto (`"0.30"`): comparação `Decimal < str` em loja
  recém-criada.
- O Hermes não informa tokens: `/api/agente/uso` mostra a quantidade de conversas com LLM, mas não o custo.
- Conferir que `API_SEGREDO` está definido na Vercel (sem ele, o rate limit vê todos os visitantes como um IP).
