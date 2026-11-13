---
name: agente-nova-ferramenta
description: Use ao criar ou alterar uma ferramenta do agente do MidiaComercial (apps/agente/ferramentas). Cobre registro @ferramenta, papel mínimo, JSON Schema, regra "propõe, não grava", privacidade, offline, prompt e testes obrigatórios.
---

# Nova ferramenta do agente

Referência: `docs/13-AGENTE.md`. Princípio: **o agente propõe, a pessoa confirma.**

## Checklist

1. **Escolha o arquivo** em `apps/agente/ferramentas/` pelo domínio (`balcao.py`, `clientes.py`, `publico.py`)
   ou crie um novo e importe no fim de `ferramentas/__init__.py`.
2. **Registre:**
   ```python
   @ferramenta(
       "nome_em_snake_case",
       "Descrição curta que o LLM lê para decidir quando usar.",
       "gerente",  # papel mínimo: atendente | gerente | dono
       {"type": "object", "properties": {...}, "required": [...]},
   )
   def nome_em_snake_case(ctx: Contexto, **args) -> dict: ...
   ```
   - O schema é o contrato: `validar_args` descarta chave desconhecida e checa obrigatórios, tipo e `enum`.
   - Use `enum` para valores fechados (motivos, faixas): o erro volta ao LLM com as opções válidas.
3. **Leitura:** sempre `Modelo.objects.da_loja(ctx.loja)`. Nunca receba `loja_id` por argumento.
4. **Escrita:** nunca grave dado de domínio. Crie `PropostaAgente` pendente, adicione em `ctx.propostas` e
   implemente a gravação em `services.confirmar()`, reutilizando o service do formulário.
5. **Privacidade:** devolva agregados. Nome e WhatsApp só saem de `apps/clientes` para quem tem papel, e nunca
   para o LLM (a saída passa por `ocultar()`, mas não conte só com isso).
6. **Offline:** se a ferramenta deve funcionar sem IA, ensine `provedores/offline.py` (`intencao`, `planejar`)
   a chamá-la.
7. **Prompt:** se o LLM precisa de regra para usá-la, edite só `provedores/prompts.py` (`SISTEMA`). Vale para
   Hermes e Claude.
8. **Testes** em `apps/agente/tests/` (padrão de `test_agente.py`):
   - [ ] proposta correta (nada gravado antes de confirmar)
   - [ ] entrada ambígua marca `campos_incertos`
   - [ ] loja alheia não enxerga
   - [ ] papel insuficiente é bloqueado (`FerramentaNegada`)
   - [ ] argumentos inválidos geram `ArgumentoInvalido`
   - Provedor externo só com cliente ou ponte falsos. Nunca chame LLM real em teste.
9. Rode `pytest apps/agente` e `ruff check . && ruff format --check .`.
10. Atualize a tabela de ferramentas em `docs/13-AGENTE.md` §5.
