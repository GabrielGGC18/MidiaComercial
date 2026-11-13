# PV-05 · Vínculo de cliente entre sistemas e pendências de identificação

**Dono:** Pessoa 2 · **Prioridade:** P1 · **Estimativa:** 4 h · **Depende de:** nada

## Problema

- **Um só código:** o histórico liga `Cliente.ref` a `Pedido.cliente_ref` (`apps/clientes/services.py`, `historico()`). Se o PDV usa um código e a planilha de clientes usa outro, o vínculo se perde.
- **Pendência invisível:** não há como ver quantas vendas estão sem cliente, nem quais poderiam ser ligadas.

**Regra do [docs/10 §4](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#4-decisões):** nunca unir clientes por nome parecido. Venda sem cliente continua valendo para a análise.

## Onde mexer

- `apps/clientes/models.py`: `VinculoCliente`
- `apps/clientes/services.py`: `resolver_cliente()`, `historico()`, `pendencias_vinculo()`
- `apps/clientes/api.py`: endpoints
- `apps/clientes/tests/`

## Passo a passo

1. **Modelo:**
   ```python
   class VinculoCliente(ModeloDaLoja):
       cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="vinculos")
       sistema_origem = models.CharField(max_length=40)   # "csv", "pdv_x", "planilha"
       codigo_externo = models.CharField(max_length=64)   # opaco: nunca CPF/telefone
       criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")

       class Meta:
           constraints = [models.UniqueConstraint(
               fields=["loja", "sistema_origem", "codigo_externo"], name="vinculo_unico")]
   ```
   Reaproveite a validação `_PARECE_DADO_PESSOAL` de `apps/importacao/schemas.py` para recusar CPF e telefone em `codigo_externo`.
2. **Resolver em um lugar só:**
   ```python
   def refs_do_cliente(loja, cliente) -> set[str]:
       return {cliente.ref, *cliente.vinculos.values_list("codigo_externo", flat=True)}
   ```
   - `historico()` passa a aceitar os vínculos: monte o mapa `codigo → cliente.ref` e agregue.
   - A medição (`prospeccao.medir` e `verificar_conversoes`) usa o mesmo helper.
3. **Pendências:** `GET /api/clientes/pendencias` (gerente) devolve:
   - vendas dos últimos N dias sem `cliente_ref`;
   - `cliente_ref` que aparece nas vendas, mas não tem `Cliente` nem `VinculoCliente`, com contagem e última data, **sem dado pessoal**.
4. **Ligar manualmente:** `POST /api/clientes/{id}/vinculos` com `{sistema_origem, codigo_externo}`. Audite com `registrar_evento`.
5. **Proibido:** sugerir vínculo por nome parecido. Sugestão automática só por código idêntico ou WhatsApp idêntico informado pela loja.

## Como testar

- **Histórico:** o cliente com vínculo `pdv:123` passa a ter no histórico as vendas com `cliente_ref = "123"`.
- **Unicidade:** o mesmo código externo não liga dois clientes (`IntegrityError` → 409 na API).
- **Pendências:** a lista mostra os códigos órfãos e as vendas sem cliente.
- **Isolamento:** os vínculos da loja A não aparecem na loja B (404).

## Pronto quando

- [ ] Existe o `VinculoCliente`, com migração e validação de código opaco.
- [ ] O histórico e a medição consideram os vínculos.
- [ ] O endpoint de pendências funciona, sem expor dado pessoal.
- [ ] Nenhuma união por nome.
