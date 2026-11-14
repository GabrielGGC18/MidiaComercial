"""Paginação explícita, com envelope em português (P1-06).

{"itens": [...], "total": 139, "pagina": 1, "por_pagina": 30, "paginas": 5}
"""

from math import ceil


def paginar(itens: list, pagina: int, por_pagina: int) -> dict:
    por_pagina = max(1, min(por_pagina, 100))
    total = len(itens)
    paginas = max(1, ceil(total / por_pagina))
    pagina = max(1, min(pagina, paginas))
    ini = (pagina - 1) * por_pagina
    return {
        "itens": itens[ini : ini + por_pagina],
        "total": total,
        "pagina": pagina,
        "por_pagina": por_pagina,
        "paginas": paginas,
    }
