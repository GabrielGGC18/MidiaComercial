"""Priorização transparente, sem falsa precisão (§4.4).

ordem = (A, dados suficientes) > (A, estoque desatualizado) > B > C
desempate = maior amostra → maior urgência → menor esforço
"""

from .regras.base import OportunidadeCandidata

MAX_CARTOES = 3


def _rank_regra(regra: str, status: str) -> int:
    if regra.startswith("A_"):
        return 0 if status == "suficiente" else 1
    if regra.startswith("B_"):
        return 2
    return 3


def _amostra(op: OportunidadeCandidata) -> int:
    return max((e.amostra for e in op.evidencias), default=0)


def priorizar(
    candidatas: list[tuple[OportunidadeCandidata, str]],
) -> list[tuple[OportunidadeCandidata, str]]:
    """Recebe (oportunidade, status_da_regra) e devolve no máximo 3, já ordenadas."""
    ordenadas = sorted(
        candidatas,
        key=lambda c: (
            _rank_regra(c[0].regra, c[1]),
            -_amostra(c[0]),
            -c[0].urgencia,
            c[0].esforco,
        ),
    )
    return ordenadas[:MAX_CARTOES]
