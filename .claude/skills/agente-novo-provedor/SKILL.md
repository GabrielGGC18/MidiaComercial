---
name: agente-novo-provedor
description: Use ao adicionar ou mudar um provedor de LLM do agente do MidiaComercial (apps/agente/provedores), ou ao mexer no prompt, no fallback offline, na ponte do Hermes ou na contagem de uso.
---

# Novo provedor de LLM

Referência: `docs/13-AGENTE.md` §4 e `docs/09-DECISAO-FRAMEWORK-IA.md` (sem LangChain/LangGraph).

## Contrato (`provedores/__init__.py`)

```python
class Provedor(Protocol):
    nome: str          # gravado em SessaoAgente.provedor
    modelo: str
    uso: Uso           # tokens_entrada / tokens_saida (0 se o provedor não informa)
    def executar(self, ctx, texto: str, chamar, historico: list[dict]) -> str: ...
```

- `texto` já chega **mascarado**. Nunca desmascare no provedor.
- O provedor só decide ferramenta e argumentos e chama `chamar(nome, args)`. Papel, loja, validação, limite de
  passos e auditoria são do orquestrador.
- `ArgumentoInvalido` e `FerramentaNegada` voltam ao modelo para ele corrigir. Qualquer outra exceção derruba
  para o offline (comportamento desejado).
- Saída de ferramenta para o modelo: `ocultar(json.dumps(...))`, com limite de tamanho.

## Passos

1. Crie `provedores/<nome>.py`. Importe o prompt de `provedores/prompts.py` (`SISTEMA`, `contexto_da_loja`).
   **Não importe de outro provedor.**
2. SDK ou cliente pesado: importe dentro do `__init__` (só carrega se for usado).
3. Registre em `orquestrador.py`:
   ```python
   def _novo():
       from .provedores.novo import ProvedorNovo

       return ProvedorNovo()


   FABRICAS = {"hermes": _hermes, "claude": _claude, "novo": _novo}
   ```
4. Configuração em `config/settings/base.py` (`MIDIA_<NOME>_*`, via env). Chave só no `.env` da VPS, nunca no
   repositório nem em variável `VITE_*`.
5. Em `api.py`, `_modelo_configurado()`: inclua o modelo para `/api/agente/uso`.
6. Testes com cliente falso injetável (padrão de `test_provedor_hermes.py`): resposta direta, argumento errado
   corrigido, falha → fallback offline, nenhum dado pessoal no prompt. Escolha do provedor:
   `test_escolha_provedor.py`.
7. Atualize `docs/13-AGENTE.md` §4.

## Hermes (produção)

- Container → socket unix → ponte no host (systemd) → wrapper fixo via sudo → `hermes -p midiacomercial -z`.
- Os arquivos da ponte ficam em `deploy/` (fora do Git). Mudou a ponte: enviar `deploy/` e reinstalar o serviço
  na VPS (ver skill `deploy-cicd`). Nunca reinicie o container do Hermes: ele é compartilhado.
- Protocolo JSON por rodadas (`PROTOCOLO` em `hermes.py`); cada rodada leva ~6–10 s.
