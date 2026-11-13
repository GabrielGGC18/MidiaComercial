# PV-03 · Importar catálogo com cor, tamanho e preço

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 5 h · **Depende de:** PV-02 (reaproveita o mapeamento)

## Problema

- **Variante vazia:** `_variante_para()` (`apps/importacao/services.py:~200`) cria a variante **sem cor e sem tamanho**, e cria um `Produto` por SKU (`referencia = sku`). "Camiseta Azul M" e "Camiseta Azul G" viram dois produtos.
- **Tamanho chutado:** a prospecção adivinha o tamanho pelo sufixo do SKU (`apps/agente/prospeccao.py:~47`). Isso não vale para outro sistema.
- **Bloqueio da recomendação:** sem cor, tamanho e produto-pai, a recomendação por compra (PV-07) não funciona.

## Onde mexer

- `apps/importacao/models.py`: `LoteImportacao.Tipo.CATALOGO`
- `apps/importacao/schemas.py`: `LinhaCatalogoCSV`
- `apps/importacao/services.py`: validar e confirmar o catálogo
- `apps/comercio/models.py`: `Variante.preco` e `Variante.atualizado_em` (opcionais)
- `apps/agente/prospeccao.py`: usar `Variante.tamanho`

## Passo a passo

1. **Contrato** (`schemas.py`):
   ```python
   COLUNAS_CATALOGO = ("referencia", "sku", "nome", "categoria")
   COLUNAS_CATALOGO_OPC = ("cor", "tamanho", "preco")

   class LinhaCatalogoCSV(BaseModel):
       model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")
       referencia: str = Field(min_length=1, max_length=60)   # produto-pai
       sku: str = Field(min_length=1, max_length=60)
       nome: str = Field(min_length=1, max_length=160)
       categoria: str = Field(min_length=1, max_length=80)
       cor: str | None = Field(default=None, max_length=40)
       tamanho: str | None = Field(default=None, max_length=10)
       preco: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
   ```
   Reaproveite o validador de vírgula decimal de `LinhaVendaCSV`.
2. **Confirmar = upsert** (é catálogo, então atualizar é o esperado):
   - `Produto.objects.update_or_create(loja=..., referencia=..., defaults={nome, categoria})`;
   - `Variante.objects.update_or_create(loja=..., sku=..., defaults={produto, cor, tamanho, preco})`.
   - Tudo em `transaction.atomic`. Registre `registrar_evento(..., "catalogo_importado", ...)`.
3. **Variante sem produto-pai.** Se o SKU já existe e está ligado a um produto "provisório" (`referencia == sku`, criado pela importação de vendas), mova a variante para o produto-pai certo. Se o provisório ficar sem variantes, apague-o.
4. **Prévia mostra o que vai mudar:** quantos produtos são novos, quantas variantes novas e quantas variantes terão cor ou tamanho preenchido.
5. **Prospecção:** troque o cálculo pelo sufixo por `variante.tamanho`. Sem tamanho → `""` (desconhecido). Mantenha o sufixo só como último recurso, marcado como incerto.
6. **Modelo para download:** `MODELO_CATALOGO`, com dados fictícios, no mesmo padrão de `MODELO_VENDAS`.

## Como testar

- **Upsert:** importar o catálogo duas vezes não duplica.
- **Atualização:** mudar o preço numa segunda importação atualiza o valor.
- **Produto provisório:** um SKU criado antes pela venda é movido para o produto-pai e ganha cor e tamanho.
- **Prospecção:** passa a ler o tamanho da variante (ajuste os testes existentes).

## Pronto quando

- [ ] Existe o tipo de lote `catalogo`, com prévia e confirmação.
- [ ] As variantes têm cor, tamanho e preço quando o arquivo traz esses dados.
- [ ] A prospecção não depende mais do sufixo do SKU.
- [ ] Os testes passam e as migrações estão versionadas.
