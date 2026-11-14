# 5. Segurança e privacidade

## 5.1 Autenticação e sessão

- Sessão do Django por cookie (`HttpOnly`; `Secure` em produção). Sem token no `localStorage`.
- CSRF em toda escrita: a SPA lê o `csrftoken` e manda `X-CSRFToken`. A mesma origem (proxy da Vercel)
  dispensa CORS.
- Em produção: HTTPS forçado (a rota de saúde fica isenta, para o healthcheck interno), HSTS de 30 dias sem
  `includeSubDomains` (o domínio é compartilhado), `Referrer-Policy: same-origin`, sessão de 12 h.
- `SECRET_KEY` de produção obrigatória: `prod.py` recusa chave vazia ou de dev/teste.

## 5.2 Isolamento por loja e papéis

Ver [02-backend.md §2.2–2.3](02-backend.md#22-multi-loja-isolamento-por-linha). Em resumo:
- a loja vem da sessão, validada pelo vínculo;
- toda consulta usa `.da_loja()`;
- um ID de outra loja dá 404;
- o papel mínimo é checado em cada rota e em cada ferramenta do agente;
- o teste "loja A não vê loja B" cobre as rotas de leitura e de escrita.

## 5.3 Limites de requisição (`apps/core/limites.py`)

| Escopo | Padrão | Por quê |
| --- | --- | --- |
| `login_ip` | 30/min por IP | Toda tentativa de login |
| Falhas por usuário + IP | 10 em 5 min | Ninguém tranca a conta alheia errando de outro IP |
| Falhas por conta (todos os IPs) | 30 em 15 min | Força bruta distribuída. Não vale para as contas da demo (senha pública) |
| `agente` | 20/min por usuário | Cada mensagem pode chamar um LLM |
| `importacao` | 10/min por usuário | Prévia processa arquivo de vários MB |

- Em produção o contador fica num cache compartilhado (`DatabaseCache`); com 3 workers, cache em memória
  contaria 3 vezes.
- 429 em português, com `Retry-After`.
- Desbloqueio imediato: `manage.py desbloquear_login <usuario>`.

## 5.4 IP do cliente

`ip_cliente(request)` **nunca** usa o `X-Forwarded-For`, que o cliente pode forjar. A ordem é:
1. `X-Midia-Cliente-Ip`, só se vier com `X-Midia-Proxy` igual a `MIDIA_PROXY_SEGREDO` (comparação em tempo
   constante). É o caminho da Vercel, que sai por vários IPs; sem o segredo, todos os visitantes pareceriam
   um só IP.
2. `X-Real-IP`, só se a conexão vier de `MIDIA_PROXIES_CONFIAVEIS` (nginx do host ou rede Docker).
3. `REMOTE_ADDR`.

## 5.5 Dados pessoais (LGPD)

| Garantia | Onde |
| --- | --- |
| Nome e WhatsApp só em `clientes`; o motor usa `cliente_ref` opaco | regra de dependência |
| Contato só com consentimento registrado (data e origem); "Responda SAIR" revoga na hora (`/clientes/{id}/sair`) | `clientes`, `prospeccao` |
| Descanso de 14 dias entre contatos | `prospeccao.candidatos` |
| Envio sempre humano (link `wa.me`) | `PropostaAgente` de contato |
| Telefone, CPF e e-mail mascarados antes de qualquer LLM; saída de ferramenta passa por `ocultar()` | `agente/privacidade.py` |
| Frase de cadastro de cliente nunca vai ao LLM | orquestrador |
| Áudio transcrito no navegador; o servidor não guarda áudio | balcão |
| CSV bruto não é guardado (só hash, totais e linhas rejeitadas) | importação |
| Retenção: conversa parada 90 dias, auditoria 180, cadastro rejeitado 30 | `limpar_agente` (diário) |
| Atendente vê o WhatsApp mascarado nas propostas | `agente/api._p_out` |
| Idade como faixa estimada, nunca data de nascimento | `core/faixas.py` |

## 5.6 Repositório público

- O pre-commit (gitleaks, chave privada, arquivo grande, bloqueio de `.env`/banco/planilha, ruff) e o job
  `segredos` do CI barram segredo e arquivo sensível.
- Infra real (`deploy/`, runbook, `Deploy.md`) fica no `.gitignore`.
- A documentação descreve o desenho, nunca o acesso. Skill de apoio: `.claude/skills/seguranca-repo-publico`.
- O CI só aceita PR para a `main` vindo da `develop` ou de `hotfix/…`.
