# Referência da API

> Gerado por `python manage.py gerar_referencia`. Não edite à mão: rode o comando de novo.

Autenticação global por sessão do Django (cookie) + CSRF em toda escrita. **Acesso** é o papel mínimo na loja da sessão (`atendente < gerente < dono`); `logado` = só exige login; `público` = sem login. Contrato completo (schemas): `/api/docs` e `/api/openapi.json`.

Total: 55 operações.

## `acoes`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/acoes/` | gerente |  |
| POST | `/api/acoes/` | gerente |  |
| GET | `/api/acoes/{int:plano_id}` | gerente |  |
| PATCH | `/api/acoes/{int:plano_id}` | gerente |  |
| GET | `/api/acoes/{int:plano_id}/medicao-sugerida` | gerente |  |
| POST | `/api/acoes/{int:plano_id}/medicoes` | gerente |  |

## `agente`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/agente/campanhas` | gerente |  |
| POST | `/api/agente/campanhas/{int:campanha_id}/encerrar` | gerente |  |
| GET | `/api/agente/conversas` | atendente |  |
| DELETE | `/api/agente/conversas/{int:sessao_id}` | atendente | Apaga o texto (LGPD / "Limpar conversa"). Auditoria e propostas confirmadas ficam: |
| GET | `/api/agente/conversas/{int:sessao_id}` | atendente |  |
| GET | `/api/agente/ferramentas` | atendente |  |
| POST | `/api/agente/mensagens` | atendente |  |
| GET | `/api/agente/propostas` | atendente |  |
| POST | `/api/agente/propostas/{int:proposta_id}/confirmar` | atendente |  |
| POST | `/api/agente/propostas/{int:proposta_id}/enviada` | gerente |  |
| POST | `/api/agente/propostas/{int:proposta_id}/rejeitar` | atendente |  |
| POST | `/api/agente/prospeccao` | gerente |  |
| GET | `/api/agente/uso` | gerente | Quanto o agente foi usado e quanto custou em tokens (para o dono decidir se liga o LLM). |

## `clientes`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/clientes/` | gerente |  |
| POST | `/api/clientes/` | gerente |  |
| GET | `/api/clientes/exportar` | gerente |  |
| POST | `/api/clientes/importar` | gerente |  |
| GET | `/api/clientes/modelo` | público |  |
| GET | `/api/clientes/{int:cliente_id}` | gerente |  |
| PUT | `/api/clientes/{int:cliente_id}` | gerente |  |
| POST | `/api/clientes/{int:cliente_id}/sair` | gerente | Cliente respondeu SAIR: revoga o consentimento na hora. |

## `contas`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | público |  |
| POST | `/api/auth/logout` | logado |  |
| GET | `/api/csrf` | público | Define o cookie csrftoken para a SPA. |
| GET | `/api/me` | logado |  |
| POST | `/api/me/loja` | logado |  |

## `core`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/saude` | público | Pública. 200 com banco respondendo; 503 sem detalhe interno (nada de erro do banco). |

## `importacao`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/importacoes/` | gerente |  |
| GET | `/api/importacoes/exemplo` | gerente | CSV sintético da loja atual (novos pedidos + erros e duplicadas de propósito) para a demo. |
| GET | `/api/importacoes/modelo` | público |  |
| POST | `/api/importacoes/preview` | gerente |  |
| GET | `/api/importacoes/{int:lote_id}` | gerente |  |
| POST | `/api/importacoes/{int:lote_id}/cancelar` | gerente |  |
| POST | `/api/importacoes/{int:lote_id}/confirmar` | gerente |  |

## `inteligencia`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/oportunidades/` | gerente | Só lê a análise vigente. Nunca calcula (isso é do POST /gerar). |
| POST | `/api/oportunidades/gerar` | gerente |  |
| GET | `/api/oportunidades/{int:oportunidade_id}` | gerente |  |
| POST | `/api/oportunidades/{int:oportunidade_id}/adiar` | gerente | "Lembrar depois" (UX-07): some do painel por N dias e não volta num recálculo |
| POST | `/api/oportunidades/{int:oportunidade_id}/descartar` | gerente |  |

## `notificacoes`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/notificacoes/` | atendente |  |
| GET | `/api/notificacoes/contagem` | atendente |  |
| POST | `/api/notificacoes/ler-todas` | atendente |  |
| POST | `/api/notificacoes/{int:notificacao_id}/ler` | atendente |  |

## `publico`

| Método | Rota | Acesso | O que faz |
| --- | --- | --- | --- |
| GET | `/api/analises/publico` | gerente |  |
| GET | `/api/catalogo/` | atendente |  |
| POST | `/api/demandas/` | atendente |  |
| GET | `/api/demandas/ranking` | gerente |  |
| GET | `/api/demandas/recentes` | atendente |  |
| DELETE | `/api/demandas/{int:demanda_id}` | atendente | Desfaz registro feito por engano (só o próprio autor, até 10 min). |
