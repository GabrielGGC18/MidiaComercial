# 6. Testes e qualidade

## 6.1 Backend (pytest)

`pytest` usa `config.settings.test` (banco de teste descartável e limites folgados). Fixtures comuns em
`conftest.py`: `duas_lojas` (loja A e B com um gerente cada), `cliente_a` e `api_login`, que segue o fluxo
real da SPA (CSRF, depois login).

| App | Arquivos | O que garantem |
| --- | --- | --- |
| `core` | `test_isolamento`, `test_saude`, `test_seed` | Loja A não vê B; sessão adulterada não vaza; IDs alheios dão 404; saúde 200/503 sem detalhe; seed consistente |
| `contas` | `test_rate_limit` | Bloqueio só no mesmo IP; acerto zera; `X-Forwarded-For` forjado não escapa; segredo do proxy; limite global por conta; demo isenta; desbloqueio |
| `importacao` | `test_importacao_api`, `test_schema_csv` | Prévia → confirmação → reimportação sem duplicar; mensagens por linha em português |
| `inteligencia` | `test_regras`, `test_explicacao`, `test_snapshots` | Regras puras (dispara/bloqueia); explicação sem repetir a limitação; GET não grava; recálculo idempotente; análise anterior preservada; adiar; uma ação por alvo; corrida na publicação; loja nova |
| `acoes` | `test_fluxo_demo`, `test_auditoria` | Ciclo oportunidade → ação → medição → conclusão; auditoria append-only |
| `clientes` | `test_clientes` | Filtros, consentimento, importar/exportar, paginação |
| `agente` | `test_agente`, `test_provedor_claude`, `test_provedor_hermes`, `test_escolha_provedor`, `test_conversas`, `test_mensagem_honesta`, `test_retencao`, `test_frases` | Propõe sem gravar; papel; mascaramento; provedores com cliente/ponte falsos (nunca rede); fallback offline; histórico e janela do LLM; mensagem honesta; confirmação idempotente; retenção; 53 frases de balcão |
| `notificacoes` | `test_observer` | Eventos após o commit; agrupamento; não repete aviso |

**Regras:**
- Teste de provedor de LLM nunca chama a rede: use cliente falso ou ponte falsa.
- Teste que cria dados para o módulo inteiro desfaz numa transação no fim; nada de `delete` na limpeza,
  porque se a ordem de teardown mudar não há como apagar fora do banco de teste.
- Regra nova do motor: teste puro com `ContextoAnalise` montado à mão, sem banco.
- Rota nova: teste de isolamento ("loja A não vê loja B") e de papel.

## 6.2 Avaliação do agente

`apps/agente/tests/frases_balcao.json` + `apps/agente/avaliacao.py`:

- **Teste parametrizado** (`test_frases.py`): cada frase confere só os campos de `esperado`. Falha conhecida
  usa `xfail` estrito; quando alguém conserta, o teste avisa para tirar a marca.
- **Comando** `avaliar_agente --provedor offline|hermes|claude`: acurácia por campo e lista de erros, sem
  gravar nada. Ferramentas de leitura rodam de verdade; as que gravariam só são registradas.
- Resultado e histórico: [docs/09 §8](../09-DECISAO-FRAMEWORK-IA.md#8-avaliação-com-frases-reais-de-balcão-p2-03).

## 6.3 Frontend (Vitest)

`npm test`, `npm run typecheck` e `npm run build`. Testes ao lado do código (`*.test.ts(x)`): cliente da API e
middleware, sessão, componentes do produto, detalhe da oportunidade, efeitos, apresentação e formatação.

## 6.4 Lint e formatação

- Python: `ruff check` e `ruff format`, com versão fixa no `pyproject.toml` (versão nova muda a formatação).
  O formatador só olha Python; Markdown fica fora.
- Pre-commit: gitleaks, chave privada, arquivo grande, bloqueio de `.env`/banco/planilha, ruff.

## 6.5 CI (`.github/workflows/ci.yml`)

| Job | Quando | Verifica |
| --- | --- | --- |
| `origem-do-pr` | PR para a `main` | Só aceita origem `develop` ou `hotfix/…` |
| `segredos` | push e PR | gitleaks no histórico + arquivo sensível versionado |
| `backend` | push e PR | ruff, `makemigrations --check`, pytest com Postgres 16 |
| `frontend` | push e PR | `npm ci`, typecheck, testes, build |

Roda em push na `develop` e na `main` e em todo PR. O CD da produção só publica commit da `main` com CI verde.
Checklist "antes da main": [docs/14 §0](../14-DEPLOY-E-OPERACAO.md#0-fluxo-de-branches).
