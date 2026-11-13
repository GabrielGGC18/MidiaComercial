"""Escolha do provedor (orquestrador.FABRICAS) e contagem de uso por provedor."""

import pytest
from django.test import override_settings

from apps.agente import orquestrador
from apps.agente.models import SessaoAgente
from apps.agente.provedores.hermes import ProvedorHermes
from apps.agente.provedores.offline import ProvedorOffline


@override_settings(MIDIA_IA_HABILITADA=False, MIDIA_IA_PROVEDOR="hermes")
def test_ia_desligada_usa_offline():
    assert isinstance(orquestrador.escolher_provedor(), ProvedorOffline)


@override_settings(MIDIA_IA_HABILITADA=True, MIDIA_IA_PROVEDOR="hermes")
def test_hermes_configurado():
    assert isinstance(orquestrador.escolher_provedor(), ProvedorHermes)


@override_settings(MIDIA_IA_HABILITADA=True, MIDIA_IA_PROVEDOR="gpt-direto")
def test_provedor_desconhecido_cai_no_offline(caplog):
    assert isinstance(orquestrador.escolher_provedor(), ProvedorOffline)
    assert "desconhecido" in caplog.text


@override_settings(MIDIA_IA_HABILITADA=True, MIDIA_IA_PROVEDOR="hermes")
def test_falha_ao_montar_provedor_cai_no_offline(monkeypatch, caplog):
    def quebra():
        raise RuntimeError("ponte fora")

    monkeypatch.setitem(orquestrador.FABRICAS, "hermes", quebra)
    assert isinstance(orquestrador.escolher_provedor(), ProvedorOffline)
    assert "ponte fora" in caplog.text


@pytest.mark.django_db
@override_settings(MIDIA_IA_HABILITADA=True, MIDIA_IA_PROVEDOR="hermes")
def test_uso_conta_hermes_como_llm(duas_lojas, cliente_a):
    loja, user = duas_lojas["loja_a"], duas_lojas["user_a"]
    SessaoAgente.objects.create(loja=loja, usuario=user, provedor="hermes", turnos=1)
    SessaoAgente.objects.create(loja=loja, usuario=user, provedor="offline", turnos=1)
    u = cliente_a.get("/api/agente/uso").json()
    assert u["sessoes"] == 2 and u["com_llm"] == 1
    assert u["modelo"] == "hermes:midiacomercial"
