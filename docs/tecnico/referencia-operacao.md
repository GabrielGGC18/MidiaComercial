# Referência de comandos e configurações

> Gerado por `python manage.py gerar_referencia`. Não edite à mão: rode o comando de novo.

## Comandos (`manage.py`)

| Comando | App | O que faz |
| --- | --- | --- |
| `avaliar_agente` | agente | Acurácia do agente por campo, com as frases de balcão. Não grava nada. |
| `desbloquear_login` | contas | Zera o contador global de falhas de login de uma conta. |
| `gerar_referencia` | core | Gera docs/tecnico/referencia-*.md a partir do código (API, modelos, comandos, settings). |
| `limpar_agente` | agente | Apaga texto antigo do agente (LGPD). Use --simular para só contar. |
| `seed_demo` | core | Cria dados 100% sintéticos para a demo (2 lojas). |
| `verificar_prazos` | notificacoes | Publica eventos de ação atrasada e estoque desatualizado (padrão Observer). |

## Configurações do produto (`config/settings/base.py`)

Padrões definidos no código. Os valores de produção ficam no `.env` do servidor e **não** aparecem aqui.

| Setting | Padrão no código | Nota |
| --- | --- | --- |
| `MIDIA_IA_HABILITADA` | `False` |  |
| `MIDIA_IA_PROVEDOR` | `"offline"` | offline / claude / hermes |
| `MIDIA_IA_API_KEY` | `vazio (definir só no .env)` |  |
| `MIDIA_IA_MODELO` | `"claude-haiku-4-5"` |  |
| `MIDIA_IA_TIMEOUT` | `20.0` |  |
| `MIDIA_IA_MAX_TOKENS` | `1024` |  |
| `MIDIA_AGENTE_MAX_PASSOS` | `6` |  |
| `MIDIA_AGENTE_HISTORICO_GUARDADO` | `100` | falas guardadas para reabrir a conversa (mascaradas) |
| `MIDIA_AGENTE_HISTORICO` | `6` | últimas falas (mascaradas) reenviadas ao LLM na mesma sessão |
| `MIDIA_HERMES_SOCKET` | `"/var/lib/midiacomercial-hermes/ponte.sock"` |  |
| `MIDIA_HERMES_TIMEOUT` | `40.0` |  |
| `MIDIA_HERMES_MAX_RODADAS` | `3` |  |
| `MIDIA_LIMITE_LOGIN_IP` | `"30/m"` |  |
| `MIDIA_LOGIN_MAX_FALHAS` | `10` |  |
| `MIDIA_LOGIN_JANELA_FALHAS` | `300` | segundos |
| `MIDIA_LOGIN_MAX_FALHAS_CONTA` | `30` |  |
| `MIDIA_LOGIN_JANELA_CONTA` | `900` | segundos |
| `MIDIA_PROXIES_CONFIAVEIS` | `"127.0.0.1/32,::1/128,172.16.0.0/12"` |  |
| `MIDIA_PROXY_SEGREDO` | `vazio (definir só no .env)` |  |
| `MIDIA_LIMITE_AGENTE` | `"20/m"` |  |
| `MIDIA_LIMITE_IMPORTACAO` | `"10/m"` |  |
