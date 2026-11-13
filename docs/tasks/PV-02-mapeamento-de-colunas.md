# PV-02 · Mapeamento de colunas salvo por loja

**Dono:** Pessoa 1 · **Prioridade:** P1 · **Estimativa:** 4 h (backend) · **Depende de:** nada · **Tela:** UX-04

## Problema

O CSV de vendas exige os nomes exatos `pedido_id;item_id;data_hora;sku;...` (`apps/importacao/schemas.py`, `COLUNAS_OBRIGATORIAS`). O sistema da loja exporta "Cód. Venda", "Data", "Referência"… A cada envio, o lojista teria de renomear as colunas no Excel. É exatamente a dificuldade de preencher dados que a pesquisa encontrou.

A importação de clientes já aceita nomes alternativos (`ALIASES` em `apps/clientes/services.py:39`). Use como referência.

## Onde mexer

- `apps/importacao/models.py`: modelo novo `MapeamentoColunas`
- `apps/importacao/schemas.py`: apelidos conhecidos
- `apps/importacao/services.py`: `_ler_csv` aplica o mapa
- `apps/importacao/api.py`: endpoints
- `apps/importacao/tests/`

## Passo a passo

1. **Modelo:**
   ```python
   class MapeamentoColunas(ModeloDaLoja):
       tipo = models.CharField(max_length=10, choices=LoteImportacao.Tipo.choices)
       # {"Cód. Venda": "pedido_id", "Data": "data_hora", ...}  coluna do arquivo → campo nosso
       mapa = models.JSONField(default=dict)
       atualizado_em = models.DateTimeField(auto_now=True)

       class Meta:
           constraints = [models.UniqueConstraint(fields=["loja", "tipo"], name="mapa_unico_por_tipo")]
   ```
   Rode `makemigrations importacao`.
2. **Apelidos padrão** em `schemas.py`, no mesmo formato de `ALIASES`:
   ```python
   APELIDOS_VENDAS = {
       "pedido_id": {"pedido_id", "pedido", "cod_venda", "numero_venda", "venda"},
       "data_hora": {"data_hora", "data", "data_venda", "emissao"},
       "sku": {"sku", "cod_barras", "codigo_produto", "referencia_variante"},
       ...
   }
   ```
   Normalize o cabeçalho antes de comparar: minúsculas, sem acento, espaço e ponto viram `_`. Copie a ideia de `_chave()` de `apps/clientes/services.py`.
3. **Ordem de resolução em `_ler_csv`:**
   1. mapa salvo da loja;
   2. apelidos;
   3. nome exato.

   Continue rejeitando quando faltar coluna obrigatória, mas diga **qual coluna do arquivo** parece ser a candidata.
4. **API:**
   - `POST /api/importacao/colunas` (gerente): recebe o arquivo e devolve `{colunas_do_arquivo, sugestao: {coluna: campo|null}, faltando: [...]}` **sem gravar nada**.
   - `PUT /api/importacao/mapeamento/{tipo}` (gerente): salva o mapa.
   - **Validação do mapa:** destino só entre `COLUNAS_OBRIGATORIAS + COLUNAS_OPCIONAIS`, sem destino repetido.
5. **Segurança:** a loja vem da sessão (`loja_com_papel`). O mapa nunca guarda conteúdo do arquivo, só nomes de coluna.

## Como testar

- **Apelidos:** um arquivo com "Cód. Venda;Data;SKU;…" gera a sugestão certa.
- **Mapa salvo:** com o mapa salvo, a prévia do mesmo arquivo passa sem erro de coluna.
- **Isolamento:** o mapa da loja A não afeta a loja B.
- **Validação:** um mapa com destino inválido dá 422.

## Pronto quando

- [ ] Arquivo com cabeçalho diferente importa depois de mapear uma vez.
- [ ] Mapa por loja e por tipo, com migração.
- [ ] Mensagem de coluna faltando diz o que fazer, em português de loja.
- [ ] Testes cobrem apelido, mapa salvo e isolamento entre lojas.
