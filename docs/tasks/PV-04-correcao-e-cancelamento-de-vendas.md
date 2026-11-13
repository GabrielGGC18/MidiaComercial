# PV-04 · Correção e cancelamento de vendas na reimportação

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 5 h · **Depende de:** nada para as partes 1 a 3; PV-07 para a parte 4 (invalidar propostas)

## Problema

Hoje, uma venda que muda depois de importada **nunca é atualizada**:

- `_validar_vendas()` (`apps/importacao/services.py:124`) marca como **duplicada**, já na prévia, toda linha cujo `(pedido_id, item_id)` existe no banco.
- Em `confirmar()`, pedido e item usam `get_or_create` (`:226` e `:242`). Os `defaults` só valem na criação.

**Efeitos:**
- a venda cancelada no PDV continua "concluída" aqui (receita inflada e proposta para quem desistiu da compra);
- o `cliente_ref` corrigido não chega;
- o `verificar_conversoes` só olha pedidos **novos** (`refs_novos`).

## Onde mexer

- `apps/comercio/models.py`: `Pedido.versao_hash`, `ItemPedido.versao_hash`
- `apps/importacao/services.py`: classificação e aplicação
- `apps/importacao/models.py`: contador `linhas_atualizadas`
- `apps/importacao/tests/`

## Passo a passo

1. **Impressão digital do conteúdo:**
   ```python
   CAMPOS_PEDIDO = ("status", "cliente_ref", "canal", "faixa_etaria", "data_hora")
   CAMPOS_ITEM = ("sku", "quantidade", "receita_item", "custo_total_item")

   def _hash(d: dict, campos) -> str:
       base = "|".join(str(d.get(c) or "") for c in campos)
       return hashlib.sha256(base.encode()).hexdigest()[:16]
   ```
   Adicione `versao_hash = CharField(max_length=16, blank=True)` em `Pedido` e em `ItemPedido`, com migração. Para os registros antigos, deixe vazio: na primeira reimportação eles serão tratados como correção.
2. **Classifique cada linha na prévia** (não descarte mais as linhas que já existem):

   | Situação | Classe | Na prévia |
   | --- | --- | --- |
   | Chave nova | `nova` | conta em `linhas_ok` |
   | Chave existe, hash igual | `repetida` | conta em `linhas_duplicadas` |
   | Chave existe, `status` passou para `cancelada` | `cancelamento` | lista separada |
   | Chave existe, outro campo mudou | `correcao` | lista "o que muda", com antes e depois, **sem dado pessoal** |

   Guarde a classe em cada item de `linhas_pendentes`.
3. **Aplicar no `confirmar()`:**
   - `correcao`: atualize só os campos permitidos (`CAMPOS_PEDIDO` e `CAMPOS_ITEM`, nunca `loja` nem `pedido_id_origem`) e grave o novo `versao_hash`. Registre a auditoria com `registrar_evento(loja, usuario, "venda_corrigida", f"pedido:{id}", campos=[...])`, citando só os **nomes** dos campos.
   - `cancelamento`: `status = cancelada`.
   - Se o `cliente_ref` mudou para um valor preenchido, inclua o novo valor em `refs_novos`.
   - Recalcule `total_importado` considerando correções e cancelamentos. Documente a regra no docstring.
4. **Invalidar propostas** (quando a PV-07 estiver na `main`): no cancelamento, propostas `pendente` com `pedido_origem` = esse pedido passam a `rejeitada`, com `limitacao = "Compra cancelada na origem"`. Use `transaction.on_commit` para publicar o evento `VENDA_ATUALIZADA` (inclua o tipo em `eventos.TIPOS`).
5. **Devolução:** fica fora. Anote no docstring: "o modelo `Devolucao` existe, mas não há fonte de importação; não conta para a elegibilidade".

## Como testar

```python
def test_reimportar_com_cancelamento_atualiza_status(loja, gerente):
    importar(loja, gerente, "V1;1;...;concluida")
    importar(loja, gerente, "V1;1;...;cancelada")   # arquivo diferente → hash do lote diferente
    assert Pedido.objects.get(pedido_id_origem="V1").status == "cancelada"
```

Teste também:
- **Repetição:** o mesmo conteúdo em outro arquivo não muda nada.
- **Correção:** o `cliente_ref` corrigido atualiza o pedido e o histórico do cliente.
- **Isolamento:** a correção da loja A não toca a loja B.

## Pronto quando

- [ ] A prévia mostra separadamente: novas, repetidas, correções e cancelamentos.
- [ ] Correção e cancelamento chegam ao banco e ficam auditados.
- [ ] A reimportação idêntica não altera nada.
- [ ] Com a PV-07 pronta, o cancelamento invalida as propostas pendentes da compra.
