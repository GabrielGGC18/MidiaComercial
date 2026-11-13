"""Provedor Hermes com ponte falsa: protocolo JSON em rodadas, validação pelo mesmo
`chamar()` do orquestrador, fallback offline e privacidade. Nenhuma chamada de rede."""

import json

import pytest
from django.test import Client

from apps.agente.models import ChamadaFerramenta, SessaoAgente
from apps.agente.provedores import hermes
from apps.core.demo import criar_demo
from conftest import api_login


@pytest.fixture
def demo(db, settings):
    criar_demo(log=lambda *_: None)
    settings.MIDIA_IA_HABILITADA = True
    settings.MIDIA_IA_PROVEDOR = "hermes"


def _c(u):
    c = Client(enforce_csrf_checks=True)
    api_login(c, u, "demo1234")
    return c


def _msg(c, texto):
    return c.post(
        "/api/agente/mensagens",
        {"texto": texto},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=c.cookies["csrftoken"].value,
    )


def _ponte(respostas, prompts):
    fila = list(respostas)

    def falsa(prompt):
        prompts.append(prompt)
        return fila.pop(0)

    return falsa


def test_rodadas_com_ferramenta_e_resposta(demo, monkeypatch):
    prompts = []
    monkeypatch.setattr(
        hermes,
        "_perguntar_ponte",
        _ponte(
            [
                json.dumps({"chamadas": [{"ferramenta": "resumo_publico", "argumentos": {}}]}),
                'Claro! {"chamadas": [], "resposta": "Calças lideram no sábado."}',
            ],
            prompts,
        ),
    )
    r = _msg(_c("gerente.centro"), "qual faixa de idade e horário mais compram?")
    assert r.status_code == 200
    corpo = r.json()
    assert corpo["provedor"] == "hermes"
    assert corpo["resposta"] == "Calças lideram no sábado."
    assert len(prompts) == 2 and "RESULTADOS" in prompts[1]  # 2ª rodada viu o resultado
    assert ChamadaFerramenta.objects.filter(ferramenta="resumo_publico").exists()


def test_ferramenta_de_outro_papel_volta_como_erro(demo, monkeypatch):
    prompts = []
    monkeypatch.setattr(
        hermes,
        "_perguntar_ponte",
        _ponte(
            [
                json.dumps({"chamadas": [{"ferramenta": "buscar_clientes", "argumentos": {}}]}),
                json.dumps({"chamadas": [], "resposta": "Não posso ver clientes."}),
            ],
            prompts,
        ),
    )
    r = _msg(_c("ana"), "quem são os clientes?")  # atendente
    assert r.json()["resposta"] == "Não posso ver clientes."
    assert '"ok": false' in prompts[1]


def test_resposta_invalida_cai_no_offline(demo, monkeypatch):
    monkeypatch.setattr(hermes, "_perguntar_ponte", _ponte(["não sei responder"], []))
    r = _msg(_c("gerente.centro"), "procurou calça jeans 42, uns 40 anos, não tinha")
    corpo = r.json()
    assert corpo["provedor"] == "offline"
    assert corpo["propostas"]  # o offline montou a proposta inteira
    assert SessaoAgente.objects.latest("id").fallback


def test_telefone_vai_mascarado(demo, monkeypatch):
    prompts = []
    monkeypatch.setattr(
        hermes,
        "_perguntar_ponte",
        _ponte([json.dumps({"chamadas": [], "resposta": "Anotado."})], prompts),
    )
    _msg(_c("gerente.centro"), "o fornecedor ligou do 63 98877-1122, retorne amanhã")
    assert "98877" not in prompts[0]


def test_ponte_fora_do_ar_cai_no_offline(demo, settings):
    settings.MIDIA_HERMES_SOCKET = "/caminho/que/nao/existe.sock"
    r = _msg(_c("gerente.centro"), "bom dia")
    assert r.status_code == 200
    assert r.json()["provedor"] == "offline"
