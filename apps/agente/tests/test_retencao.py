"""P2-04: retenção LGPD do texto do agente."""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from apps.agente.models import ChamadaFerramenta, PropostaAgente, SessaoAgente
from apps.agente.services import limpar

pytestmark = pytest.mark.django_db


@pytest.fixture
def antigos(duas_lojas):
    loja, user = duas_lojas["loja_a"], duas_lojas["user_a"]
    velho = timezone.now() - timedelta(days=200)
    s_velha = SessaoAgente.objects.create(
        loja=loja, usuario=user, historico=[{"role": "user", "content": "x"}]
    )
    s_nova = SessaoAgente.objects.create(
        loja=loja, usuario=user, historico=[{"role": "user", "content": "y"}]
    )
    SessaoAgente.objects.filter(pk=s_velha.pk).update(atualizado_em=velho)
    ch = ChamadaFerramenta.objects.create(
        loja=loja, sessao=s_velha, usuario=user, ferramenta="f", entrada={}, ok=True
    )
    ChamadaFerramenta.objects.filter(pk=ch.pk).update(criado_em=velho)
    rej = PropostaAgente.objects.create(
        loja=loja,
        tipo="cliente",
        status="rejeitada",
        resumo="r",
        dados={"nome": "A", "whatsapp": "5563"},
        decidido_em=velho,
        criado_por=user,
    )
    conf = PropostaAgente.objects.create(
        loja=loja,
        tipo="cliente",
        status="confirmada",
        resumo="c",
        dados={},
        decidido_em=velho,
        criado_por=user,
    )
    return {"s_velha": s_velha, "s_nova": s_nova, "rej": rej, "conf": conf}


def test_simular_so_conta(antigos):
    r = limpar(simular=True)
    assert r == {"conversas": 1, "chamadas": 1, "rejeitadas": 1}
    assert SessaoAgente.objects.get(pk=antigos["s_velha"].pk).historico != []


def test_limpar_apaga_so_o_que_venceu(antigos):
    call_command("limpar_agente")
    assert SessaoAgente.objects.get(pk=antigos["s_velha"].pk).historico == []
    assert SessaoAgente.objects.get(pk=antigos["s_nova"].pk).historico != []
    assert ChamadaFerramenta.objects.count() == 0
    assert not PropostaAgente.objects.filter(pk=antigos["rej"].pk).exists()
    assert PropostaAgente.objects.filter(pk=antigos["conf"].pk).exists()  # registro de negócio fica
