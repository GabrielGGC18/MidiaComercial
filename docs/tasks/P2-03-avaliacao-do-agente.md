# P2-03 · Conjunto de avaliação do agente (frases de balcão) e comando `avaliar_agente`

**Dono:** Pessoa 2 · **Prioridade:** P1 · **Estimativa:** 4 h · **Depende de:** nada

## Problema

O agente offline (`apps/agente/provedores/offline.py`) é um parser de português feito com regex. Hoje há só 3 ou 4 frases testadas. Cada ajuste de regex pode quebrar frases que funcionavam, e ninguém percebe. Já aconteceu: "não tinha" virou o tamanho "AO", e o tamanho "U" excluía clientes.

Também não temos como responder com número à banca nem à equipe: **"o offline acerta quanto? E o Claude?"**

## Ideia

Um arquivo com cerca de 40 frases reais de balcão e o que se espera de cada uma. Ele vira:

1. um **teste parametrizado**, que roda no CI e trava regressão;
2. um **comando** que imprime a acurácia por campo e permite comparar o offline com o Claude.

Isso é o que frameworks de avaliação (LangSmith e similares) fazem, só que em ~80 linhas e sem dependência.

## Onde mexer

- `apps/agente/tests/frases_balcao.json` (novo)
- `apps/agente/tests/test_frases.py` (novo)
- `apps/agente/management/commands/avaliar_agente.py` (novo; crie as pastas `management/` e `commands/`, cada uma com `__init__.py`)

## Passo a passo

1. **Escreva as frases à mão.** Varie o jeito de falar: gíria, voz transcrita sem pontuação, ordem trocada, idade escrita de vários jeitos. Use só produtos que existem no seed (`apps/core/demo.py`).
   ```json
   [
     {"texto": "cliente procurou calça jeans 42, uns 40 anos, não tinha",
      "esperado": {"ferramenta": "propor_demanda", "sku_produto": "CJE", "tamanho": "42",
                   "motivo": "indisponivel", "faixa_etaria": "35_44"}},
     {"texto": "achou caro a bermuda cinza 40",
      "esperado": {"ferramenta": "propor_demanda", "motivo": "preco", "tamanho": "40", "cor": "Cinza"}},
     {"texto": "moça jovem queria camiseta azul m acabou",
      "esperado": {"ferramenta": "propor_demanda", "tamanho": "M", "cor": "Azul",
                   "faixa_etaria": "18_24", "motivo": "indisponivel"}},
     {"texto": "quero vender a camisa parada",
      "esperado": {"ferramenta": "prospectar_produtos_em_baixa"}},
     {"texto": "que horas o público mais compra",
      "esperado": {"ferramenta": "resumo_publico"}}
   ]
   ```
   Só os campos presentes em `esperado` são conferidos. Meta: 40 frases, sendo **pelo menos 8 difíceis**, que hoje falham. As difíceis ficam marcadas com `"conhecida_falha": true`.
2. **Avalie sem gravar nada:** use `planejar(ctx, texto)` de `offline.py`. Essa função devolve as chamadas planejadas (`[(ferramenta, args)]`) sem executar nada:
   ```python
   from apps.agente.ferramentas import Contexto
   from apps.agente.provedores.offline import planejar

   def avaliar_offline(loja, frase):
       ctx = Contexto(loja=loja, usuario=None, papel="gerente")
       nome, args = planejar(ctx, frase["texto"])[0]
       return {"ferramenta": nome, **args}
   ```
   - **`sku_produto`:** `args["produto_id"]` é um id. Converta para SKU com `Produto.objects.get(pk=...)` e confira se o SKU começa com o prefixo esperado.
3. **Teste parametrizado:**
   ```python
   FRASES = json.loads((Path(__file__).parent / "frases_balcao.json").read_text(encoding="utf-8"))

   CASOS = [
       pytest.param(f, id=f["texto"][:40],
                    marks=[pytest.mark.xfail(strict=True, reason="falha conhecida")]
                    if f.get("conhecida_falha") else [])
       for f in FRASES
   ]

   @pytest.mark.parametrize("frase", CASOS)
   def test_frase(frase, demo_loja):
       obtido = avaliar_offline(demo_loja, frase)
       for campo, valor in frase["esperado"].items():
           assert obtido.get(campo) == valor, f"{campo}: esperado {valor!r}, veio {obtido.get(campo)!r}"
   ```
   > Use a marca `xfail(strict=True)`, e não `pytest.xfail()` dentro do teste. Com a marca, quando alguém consertar a frase, o teste **falha** com "XPASS(strict)" e a pessoa tira o `conhecida_falha` do JSON. Assim a lista de falhas nunca fica desatualizada.
   > O fixture `demo_loja` roda `criar_demo` e devolve a "Loja Demo Centro" (veja o fixture `demo` em `apps/notificacoes/tests/test_observer.py`). Use `scope="module"` com `django_db_blocker` se ficar lento.
4. **Comando:**
   - `python manage.py avaliar_agente [--provedor offline|claude] [--loja "Loja Demo Centro"]`.
   - Para cada campo, imprima acertos / total e a porcentagem.
   - No fim, liste as frases que erraram.
   - Com `--provedor claude`:
     - use o `ProvedorClaude` com um `chamar` falso, que **só registra** as chamadas e devolve `{"produtos": buscar_catalogo(...)}` para `buscar_variante` e `{}` para as outras;
     - assim, nada é gravado;
     - avise no início que isso **gasta tokens** e exige `MIDIA_IA_*`.
   - Saída esperada:
     ```
     Provedor: offline · 40 frases
     ferramenta     40/40  100%
     tamanho        33/36   92%
     motivo         35/40   88%
     faixa_etaria   20/24   83%
     Erros:
      - "procurou numeração 38 do tênis branco" → tamanho: esperado '38', veio None
     ```
5. Coloque o resultado do offline (e do Claude, se o Gabriel liberar uma chave) no docs/09 §7 como números reais.

## Pronto quando

- [ ] Há 40 frases (8 ou mais difíceis, com `xfail`).
- [ ] O teste parametrizado roda no `pytest` sem gravar no banco.
- [ ] O comando imprime a acurácia por campo, para o offline e para o Claude.
- [ ] Os números estão no docs/09.
