"""P2-03: frases reais de balcão travam regressão do provedor offline.

Falha conhecida usa xfail ESTRITO: quando alguém consertar a frase, o teste falha com
XPASS(strict) e a pessoa tira o "conhecida_falha" do JSON (a lista nunca fica velha).
"""

import pytest
from django.db import transaction

from apps.agente.avaliacao import avaliar_offline, frases
from apps.contas.models import Loja
from apps.core.demo import criar_demo

CASOS = [
    pytest.param(
        f,
        id=f["texto"][:40],
        marks=[pytest.mark.xfail(strict=True, reason="falha conhecida")]
        if f.get("conhecida_falha")
        else [],
    )
    for f in frases()
]


@pytest.fixture(scope="module")
def loja(django_db_setup, django_db_blocker):
    """Demo criada uma vez por módulo dentro de uma transação DESFEITA no fim. Nada de
    delete na limpeza: se a ordem de teardown mudar, não há como apagar fora do banco
    de teste."""
    with django_db_blocker.unblock(), transaction.atomic():
        criar_demo(log=lambda *_: None)
        yield Loja.objects.get(nome="Loja Demo Centro")
        transaction.set_rollback(True)


@pytest.mark.parametrize("frase", CASOS)
def test_frase(frase, loja, django_db_blocker):
    with django_db_blocker.unblock():
        obtido = avaliar_offline(loja, frase["texto"])
    for campo, valor in frase["esperado"].items():
        assert obtido.get(campo) == valor, (
            f"{campo}: esperado {valor!r}, veio {obtido.get(campo)!r}"
        )


def test_avaliacao_nao_grava_nada(loja, django_db_blocker):
    from apps.agente.models import ChamadaFerramenta, PropostaAgente

    with django_db_blocker.unblock():
        antes = (PropostaAgente.objects.count(), ChamadaFerramenta.objects.count())
        for f in frases()[:10]:
            avaliar_offline(loja, f["texto"])
        assert (PropostaAgente.objects.count(), ChamadaFerramenta.objects.count()) == antes
