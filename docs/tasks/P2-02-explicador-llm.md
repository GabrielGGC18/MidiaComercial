# P2-02 · Ligar de verdade o explicador por LLM das oportunidades

**Dono:** Pessoa 2 · **Prioridade:** P2 · **Estimativa:** 3 h · **Depende de:** nada

## Problema

`apps/inteligencia/explicacao/llm.py` tem o `ExplicadorLLM`, mas a função `explicador()` cria `ExplicadorLLM()` **sem cliente** (`cliente=None`). Com `MIDIA_IA_HABILITADA=True`, a explicação **continua vindo sempre do template**: a IA nunca é chamada. O próprio arquivo diz "Integração real com provedor fica para P1".

A guarda já existe e é boa: `validar_saida()` recusa qualquer número que não esteja nos fatos aprovados.

## Decisão (segue o docs/09)

- SDK `anthropic` direto, sem LangChain.
- O mesmo modelo do agente (`MIDIA_IA_MODELO`, padrão `claude-haiku-4-5`).
- A IA só **reescreve** o texto do template, deixando-o mais natural. Ela não calcula nada.

## Onde mexer

- `apps/inteligencia/explicacao/llm.py`
- `apps/inteligencia/tests/` (novo teste)

## Passo a passo

1. Crie um cliente pequeno, com a interface que o `ExplicadorLLM` já espera (`reescrever(texto) -> str`):
   ```python
   class ClienteClaude:
       SISTEMA = (
           "Reescreva o texto abaixo para o dono de uma loja de moda, em português do Brasil, "
           "em no máximo 2 frases, linguagem simples. NÃO acrescente, remova ou altere números. "
           "NÃO invente fatos. Devolva só o texto."
       )

       def __init__(self):
           import anthropic

           self.c = anthropic.Anthropic(
               api_key=settings.MIDIA_IA_API_KEY, timeout=settings.MIDIA_IA_TIMEOUT, max_retries=1
           )

       def reescrever(self, texto: str) -> str:
           r = self.c.messages.create(
               model=settings.MIDIA_IA_MODELO,
               max_tokens=300,
               system=self.SISTEMA,
               messages=[{"role": "user", "content": texto}],
           )
           return "".join(b.text for b in r.content if b.type == "text").strip()
   ```
2. Troque a fábrica para só usar a IA quando tudo estiver configurado:
   ```python
   def explicador():
       if not (settings.MIDIA_IA_HABILITADA and settings.MIDIA_IA_PROVEDOR == "claude"
               and settings.MIDIA_IA_API_KEY):
           return ExplicadorTemplate()
       try:
           return ExplicadorLLM(cliente=ClienteClaude())
       except Exception:  # noqa: BLE001 - sem SDK ou config ruim → template
           return ExplicadorTemplate()
   ```
3. **O que vai para a IA:** só o texto do template, que já é feito de agregados (títulos, contagens, limitação). Confira em `explicacao/template.py` que nenhum campo traz `cliente_ref`, nome ou telefone. Se trouxer, **não** mande para a IA.
4. **Custo e latência:**
   - O motor gera no máximo 3 oportunidades, o que dá até 3 chamadas por geração.
   - Elas rodam dentro da requisição de `GET /oportunidades` quando o cache venceu.
   - Meça com o log do motor (`ExecucaoMotor`). Se passar de 3 s, pense em gerar a explicação de forma assíncrona. Isso fica registrado como risco no PR, não é para esta task.

## Testes (sem rede)

```python
class Falso:
    def __init__(self, saida): self.saida = saida
    def reescrever(self, t): return self.saida

def test_ia_reescreve_quando_numeros_batem(settings, op_exemplo):
    settings.MIDIA_IA_HABILITADA = True
    exp = ExplicadorLLM(cliente=Falso("9 clientes procuraram e não tinha."))
    ...

def test_ia_inventa_numero_volta_para_template(settings, op_exemplo):
    exp = ExplicadorLLM(cliente=Falso("Você vai vender 300 peças!"))
    assert exp.explicar(op_exemplo, "suficiente") == ExplicadorTemplate().explicar(op_exemplo, "suficiente")

def test_falha_de_rede_volta_para_template(settings, op_exemplo): ...

def test_fabrica_sem_chave_usa_template(settings):
    settings.MIDIA_IA_HABILITADA = True
    settings.MIDIA_IA_API_KEY = ""
    assert isinstance(explicador(), ExplicadorTemplate)
```

O `op_exemplo` é um `OportunidadeCandidata`. Veja como as regras montam um em `apps/inteligencia/regras/`.

## Pronto quando

- [ ] Com a IA ligada e chave configurada, a explicação passa pelo Claude. Com qualquer falha ou número inventado, volta para o template.
- [ ] Nenhum dado pessoal no texto enviado.
- [ ] Os 4 testes passam sem rede.
- [ ] O docs/09 §6 cita o explicador.
