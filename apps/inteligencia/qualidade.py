"""Indicadores de qualidade dos dados (§4.1, passo 2). Mostrados na tela e gravados na execução."""

from decimal import Decimal

from .contexto import ContextoAnalise


def indicadores(ctx: ContextoAnalise) -> dict:
    idade = ctx.idade_estoque_horas
    receita = sum((v.receita for v in ctx.vendas), Decimal("0"))
    n_ped = len(ctx.pedidos_ids)
    return {
        "receita_janela": float(receita),
        "ticket_medio": float((receita / n_ped).quantize(Decimal("0.01"))) if n_ped else 0.0,
        "pedidos_na_janela": len(ctx.pedidos_ids),
        "itens_na_janela": len(ctx.vendas),
        "demandas_na_janela": len(ctx.demandas),
        "cobertura_cliente_pct": float((ctx.cobertura_cliente * 100).quantize(Decimal("0.1"))),
        "idade_estoque_horas": round(idade, 1) if idade is not None else None,
        "estoque_atualizado": ctx.estoque_atualizado,
        "skus_com_saldo": len(ctx.estoque),
    }
