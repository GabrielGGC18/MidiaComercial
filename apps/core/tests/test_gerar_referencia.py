"""A referência gerada reflete o código (sem escrever em docs/ no teste)."""

from apps.core.management.commands.gerar_referencia import (
    referencia_api,
    referencia_modelos,
    referencia_operacao,
)


def test_api_lista_rotas_com_acesso():
    t = referencia_api()
    assert "| GET | `/api/saude` | público |" in t
    assert "| GET | `/api/oportunidades/` | gerente |" in t
    assert "| POST | `/api/demandas/` | atendente |" in t


def test_modelos_e_operacao():
    assert "erDiagram" in referencia_modelos() and "### Oportunidade" in referencia_modelos()
    op = referencia_operacao()
    assert (
        "`gerar_referencia`" in op and "`MIDIA_PROXY_SEGREDO` | `vazio (definir só no .env)`" in op
    )
