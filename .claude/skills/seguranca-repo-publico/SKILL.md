---
name: seguranca-repo-publico
description: Use antes de commitar, ao escrever documentação ou ao mexer em autenticação, rate limit, IP do cliente, dados pessoais ou LGPD no MidiaComercial. O repositório é público.
---

# Segurança: repositório público e dados de lojistas

## Antes de cada commit

- [ ] `git status` e `git diff --cached`: só o que foi pedido. Arquivo de outra pessoa ou agente fica de fora.
- [ ] Nada de: `.env`, senhas, tokens, chaves, IP da VPS, usuário de SSH, domínio da API, caminhos do host,
      nomes de containers de outros projetos, dumps, planilhas reais de clientes.
- [ ] `deploy/`, `Deploy.md` e `deploy-funcionamento-vps.md` são locais (`.gitignore`). Nunca `git add -f`.
- [ ] O pre-commit (gitleaks, detect-private-key, bloqueio de `.env`/banco/planilha, ruff) passou. Falso
      positivo: ajuste o código (ex.: use `SENHA_DEMO`), não desligue o hook.
- [ ] Documentação descreve o desenho, nunca o acesso. Use `<dominio-da-api>`.

## Dados pessoais (LGPD)

- Nome e WhatsApp só em `apps/clientes`. O núcleo analítico trabalha com agregados.
- Antes de qualquer LLM: `mascarar()`. Saída de ferramenta: `ocultar()`. Frase de cadastro nunca vai ao LLM.
- Contato só com consentimento, descanso de 14 dias e "Responda SAIR". Envio sempre humano.
- Log sem conteúdo de CSV, prompt ou dado pessoal (a ponte do Hermes não registra o prompt).

## Autenticação e limites (`apps/core/limites.py`)

- IP do cliente **nunca** vem do `X-Forwarded-For`. Vale `X-Midia-Cliente-Ip` só com `X-Midia-Proxy` igual a
  `MIDIA_PROXY_SEGREDO` (comparação em tempo constante); senão `X-Real-IP` só de `MIDIA_PROXIES_CONFIAVEIS`;
  senão `REMOTE_ADDR`.
- Cada limite tem escopo próprio: não reutilize a mesma classe em outra rota.
- Login: falha conta por usuário + IP e por conta (exceto demo); acerto zera. Desbloqueio:
  `manage.py desbloquear_login <usuario>`.
- Mudou algo aqui: rode `pytest apps/contas/tests/test_rate_limit.py` e pense no abuso. Quem consegue trancar
  quem? Quem consegue forjar o quê?

## Isolamento e papéis

- Toda consulta com `.da_loja(request.loja)`. Nunca aceite `loja_id` vindo do cliente.
- Papel via `loja_com_papel(request, "<minimo>")`. Teste "loja A não vê loja B" para cada rota nova.
