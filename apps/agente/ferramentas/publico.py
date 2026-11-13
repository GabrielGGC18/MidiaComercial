"""Ferramenta de leitura de agregados do público (segura para LLM: sem dado pessoal)."""

from apps.publico.services import janela_padrao, perfil_publico

from . import Contexto, ferramenta


@ferramenta(
    "resumo_publico",
    "Resumo agregado do público da loja: períodos mais fortes por nicho, faixa etária que mais compra, fase do mês.",
    "gerente",
    {"type": "object", "properties": {"dias": {"type": "integer", "minimum": 7, "maximum": 90}}},
)
def resumo_publico(ctx: Contexto, dias: int = 30) -> dict:
    from datetime import timedelta

    from django.utils import timezone

    fim = timezone.localdate()
    inicio, fim = janela_padrao(ctx.loja, fim - timedelta(days=dias - 1), fim)
    p = perfil_publico(ctx.loja, inicio, fim)
    per, fx = p["periodos"], p["faixas"]
    fase = max(per["fases_mes"], key=lambda f: f["receita"]) if per["fases_mes"] else None
    return {
        "periodo_mais_forte": per["top"][0]["periodo"] if per["top"] else None,
        "por_categoria": [(c["categoria"], c["melhor_periodo"]) for c in per["por_categoria"][:5]],
        "fase_do_mes_mais_forte": fase["fase"] if fase else None,
        "faixa_que_mais_compra": fx["principal"],
        "cobertura_faixa_pct": float(fx["cobertura"]["percentual"]),
        "limitacao": per["limitacao"],
    }
