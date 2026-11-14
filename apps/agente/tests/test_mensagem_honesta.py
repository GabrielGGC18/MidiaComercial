"""PV-01 (mensagem não promete reserva nem tamanho desconhecido) e confirmação idempotente."""

import pytest
from django.test import Client

from apps.agente.models import PropostaAgente
from apps.agente.prospeccao import mensagem
from apps.clientes.models import Cliente
from apps.contas.models import Loja
from apps.core.demo import criar_demo
from apps.publico.models import DemandaNaoAtendida
from conftest import api_login

pytestmark = pytest.mark.django_db

ALVO = {"sku": "CAM-AZ-M", "rotulo": "Camiseta Azul M", "categoria": "Camisetas", "tamanho": "M"}


@pytest.fixture
def demo(db):
    criar_demo(log=lambda *_: None)


def _c(username):
    c = Client(enforce_csrf_checks=True)
    api_login(c, username, "demo1234")
    return c


def test_mensagem_sem_tamanho_confirmado_nao_promete(demo):
    loja = Loja.objects.get(nome="Loja Demo Centro")
    cli = Cliente(loja=loja, nome="Ana Teste")
    txt = mensagem(loja, cli, ALVO, tamanho_confirmado=False)
    assert "separamos" not in txt.lower() and "seu tamanho" not in txt and " M," not in txt
    assert "SAIR" in txt


def test_mensagem_com_tamanho_confirmado_cita_o_tamanho(demo):
    loja = Loja.objects.get(nome="Loja Demo Centro")
    txt = mensagem(loja, Cliente(loja=loja, nome="Ana"), ALVO, tamanho_confirmado=True)
    assert "tamanho M" in txt and "separamos" not in txt.lower()


def test_prospeccao_marca_tamanho_incerto_quando_nao_confirmado(demo):
    r = _c("gerente.centro").post("/api/agente/prospeccao")
    assert r.status_code == 200
    contatos = PropostaAgente.objects.filter(tipo="contato")
    assert contatos.exists()
    for p in contatos:
        assert "separamos" not in p.dados["mensagem"].lower()
        if "tamanho" in p.campos_incertos:
            assert "tamanho" not in p.dados["mensagem"].lower().split("costuma")[0][-40:]


def test_confirmar_duas_vezes_cria_um_registro_e_diz_o_que_atualizar(demo):
    c = _c("ana")
    r = c.post(
        "/api/agente/mensagens",
        {"texto": "procurou calça jeans 42, uns 40 anos, não tinha"},
        content_type="application/json",
    )
    pid = r.json()["propostas"][0]["id"]
    antes = DemandaNaoAtendida.objects.count()
    ok = c.post(f"/api/agente/propostas/{pid}/confirmar", {}, content_type="application/json")
    assert ok.status_code == 200
    assert "oportunidades" in ok.json()["atualizar"] and "demandas" in ok.json()["atualizar"]
    de_novo = c.post(f"/api/agente/propostas/{pid}/confirmar", {}, content_type="application/json")
    assert de_novo.status_code == 409
    assert DemandaNaoAtendida.objects.count() == antes + 1
