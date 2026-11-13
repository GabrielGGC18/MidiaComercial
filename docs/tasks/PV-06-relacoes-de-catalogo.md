# PV-06 · Combinações de produtos aprovadas pelo lojista

**Dono:** Pessoa 2 (backend) + Pessoa 3 (tela) · **Prioridade:** P1 · **Estimativa:** 3 h back + 3 h front · **Depende de:** PV-03 (catálogo com produto-pai)

## Problema

Para sugerir "comprou boné → oferecer camiseta", o sistema precisa saber **o que combina com o quê**. Não vamos treinar modelo: o lojista aprova as combinações ([docs/10 §4](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#4-decisões), decisão 4).

## Onde mexer

- `apps/comercio/models.py`: `RelacaoProduto`
- `apps/comercio/api.py` (novo) + registro em `config/api.py`
- `frontend/src/features/loja/CombinacoesPage.tsx` (novo) ou uma aba na tela do dono (P2-05)

## Passo a passo (backend)

1. **Modelo:**
   ```python
   class RelacaoProduto(ModeloDaLoja):
       class Tipo(models.TextChoices):
           SEMELHANTE = "semelhante", "Semelhante (alternativa)"
           COMPLEMENTAR = "complementar", "Complementar (combina com)"

       # origem e destino: OU produto OU categoria (um dos dois)
       origem_produto = models.ForeignKey(Produto, null=True, blank=True, on_delete=models.CASCADE, related_name="+")
       origem_categoria = models.CharField(max_length=80, blank=True)
       destino_produto = models.ForeignKey(Produto, null=True, blank=True, on_delete=models.CASCADE, related_name="+")
       destino_categoria = models.CharField(max_length=80, blank=True)
       tipo = models.CharField(max_length=12, choices=Tipo.choices)
       justificativa = models.CharField(max_length=160)   # aparece no cartão: "boné e camiseta formam look casual"
       ativa = models.BooleanField(default=True)
       criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
   ```
   Use `CheckConstraint`s para exigir **exatamente um** entre `origem_produto` e `origem_categoria`, e o mesmo para o destino. Veja o exemplo em `DemandaNaoAtendida.Meta`.
2. **API (gerente+):** `GET/POST /api/comercio/relacoes`, `PUT/DELETE /api/comercio/relacoes/{id}`.
   - Valide que o produto pertence à loja (`.da_loja`).
   - Recuse origem igual ao destino.
3. **Sugestões para começar:** `GET /api/comercio/relacoes/sugestoes` lista os pares de categorias **compradas juntas no mesmo pedido** nos últimos 90 dias, com contagem. É só sugestão: o lojista aprova uma a uma. Mínimo de 3 pedidos para aparecer.

## Passo a passo (frontend)

- Lista em cartões, com a combinação "Bonés → Camisetas" e um selo **Complementar** ou **Semelhante** (ícone + texto).
- Formulário curto com 4 campos:
  - "Quem comprou…" (categoria ou produto, com busca);
  - "…pode gostar de…";
  - tipo;
  - justificativa (até 160 caracteres, com contador).
- Bloco "Sugestões a partir das suas vendas", com os botões **Aprovar** e **Ignorar**.
- **Estado vazio:** "Diga ao sistema o que combina com o quê. Ex.: Bonés → Camisetas." (ver UX-05).
- **Menu:** fica em "Loja" (configurações), só para gerente e dono.

## Como testar

- **Validação:** criar uma relação com origem e destino de categoria funciona. Com os dois vazios, dá 422.
- **Isolamento:** um produto de outra loja dá 404.
- **Sugestões:** a lista mostra o par comprado junto em 3 ou mais pedidos.

## Pronto quando

- [ ] Existem modelo, migração e API com testes de validação e isolamento.
- [ ] A tela tem criar, editar, desativar e aprovar sugestão, e funciona em 375 px.
- [ ] Os textos da tela seguem a UX-02.
