from datetime import date

from apps.inteligencia.explicacao.template import ExplicadorTemplate
from apps.inteligencia.regras.base import EvidenciaCandidata, OportunidadeCandidata


def _op():
    return OportunidadeCandidata(
        regra="A_LACUNA_MIX",
        titulo="Investigar reposição: Calça jeans Azul 42",
        acao_sugerida="Conferir estoque físico e consultar fornecedor antes de comprar.",
        limitacao="São 6 atendimentos, não 6 compradores únicos.",
        alvo={"sku": "CJE-AZ-42"},
        urgencia=3,
        esforco=1,
        evidencias=[
            EvidenciaCandidata(
                "demanda", "6 procuraram e não tinha", 6, date(2026, 10, 27), date(2026, 11, 7), 6
            )
        ],
    )


def test_template_nao_repete_limitacao_nem_acao():
    texto = ExplicadorTemplate().explicar(_op(), "suficiente")
    assert texto.startswith("Sugerimos isso porque 6 procuraram e não tinha.")
    assert "compradores" not in texto  # a limitação tem bloco próprio na tela
    assert "fornecedor" not in texto  # a ação sugerida também
