# P1-06 · Paginação na lista de clientes

**Dono:** Pessoa 1 · **Prioridade:** P2 · **Estimativa:** 3 h · **Depende de:** combinar com a Pessoa 3 (P3-03 também mexe em `ClientesPage.tsx`)

## Problema

`GET /api/clientes/` (`apps/clientes/api.py:80`) devolve **todos** os clientes que passam no filtro. A demo tem 139. Uma loja real com 5 mil clientes manda 5 mil objetos a cada busca, e o celular trava.

Outras listas cortam em silêncio, e quem usa não sabe que tem mais:

- `PropostaAgente` em `qs[:100]` (`apps/agente/api.py`);
- campanhas em `[:20]`.

## Decisão de formato

Usar paginação **explícita**, com um envelope próprio em português:

```json
{ "itens": [...], "total": 139, "pagina": 1, "por_pagina": 30, "paginas": 5 }
```

Por que não o `@paginate` do Ninja: ele devolve `{items, count}` em inglês e esconde o tamanho da página. O `services.buscar` devolve uma lista de dicts, não um queryset. O envelope próprio é mais simples de ler e de testar.

## Onde mexer

- `apps/clientes/api.py` e `apps/clientes/services.py` (`buscar`, linha 245)
- `frontend/src/api/types.ts`
- `frontend/src/features/clientes/ClientesPage.tsx`
- testes em `apps/clientes/tests/`

## Passo a passo

1. **Backend:** o schema genérico. Crie em `apps/core/paginacao.py` para reaproveitar depois:
   ```python
   from math import ceil

   from ninja import Schema


   def paginar(itens: list, pagina: int, por_pagina: int) -> dict:
       por_pagina = max(1, min(por_pagina, 100))
       total = len(itens)
       paginas = max(1, ceil(total / por_pagina))
       pagina = max(1, min(pagina, paginas))
       ini = (pagina - 1) * por_pagina
       return {"itens": itens[ini : ini + por_pagina], "total": total,
               "pagina": pagina, "por_pagina": por_pagina, "paginas": paginas}
   ```
2. **Backend:** a rota.
   ```python
   class PaginaClientes(Schema):
       itens: list[ClienteOut]
       total: int
       pagina: int
       por_pagina: int
       paginas: int

   @router.get("/", response=PaginaClientes)
   def listar(request, q: str = "", ..., pagina: int = 1, por_pagina: int = 30):
       loja = loja_com_papel(request, "gerente")
       achados = services.buscar(loja, q=q[:80], ...)
       return paginar(achados, pagina, por_pagina)
   ```
   Confira se `services.buscar` aplica um `limite`. Se aplicar, aumente ou remova esse limite, senão o `total` fica errado.
   > **Melhoria opcional:** se `buscar` virar queryset, use `qs.count()` e `qs[ini:fim]` para não carregar tudo na memória. Faça só se der tempo.
3. **O texto "139 clientes · 95 autorizaram contato"** precisa vir do total, não do tamanho da página. Confira de onde a tela tira esses números. Se vier de `lista.length`, troque por `total`. O número de autorizados pode precisar de um campo extra no envelope (`autorizados`).
4. **Frontend `types.ts`:**
   ```ts
   export type Pagina<T> = { itens: T[]; total: number; pagina: number; por_pagina: number; paginas: number };
   ```
5. **Frontend `ClientesPage.tsx`:**
   - Guarde `pagina` na query string, como os outros filtros (`useSearchParams`).
   - Inclua `pagina` na `queryKey`.
   - Use `placeholderData: (prev) => prev` para a lista não piscar ao trocar de página.
   - Ponha um rodapé com "Anterior" e "Próxima" e o texto `Página 2 de 5`.
   - Alvos de 44 px e `aria-label`.
   - Ao mudar qualquer filtro, volte para a página 1.
6. **Exportar CSV continua exportando tudo:** não pagine o `/exportar`.

## Como testar

- **pytest:**
  - `por_pagina=10` → 10 itens e `paginas == 14` (com os 139 da demo);
  - `pagina=999` → última página;
  - loja B não vê clientes da loja A (o teste de acesso cruzado continua passando).
- **Tela:** a paginação aparece em 375 px sem estourar a largura.

## Pronto quando

- [ ] O envelope `{itens,total,pagina,por_pagina,paginas}` está na API e nos tipos.
- [ ] A tela tem paginação na URL e na queryKey.
- [ ] Os totais do cabeçalho estão certos.
- [ ] Os testes passam.
