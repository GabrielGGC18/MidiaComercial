"""P2-01: histórico de conversas do agente (listar, abrir, apagar) e janela curta do LLM."""

import anthropic
import pytest
from django.test import Client

from apps.agente.models import PropostaAgente, SessaoAgente
from apps.agente.tests.test_provedor_claude import Falso, _fim
from apps.contas.models import Loja, Vinculo
from apps.core.demo import criar_demo
from conftest import api_login

pytestmark = pytest.mark.django_db

FRASE = "procurou calça jeans 42, uns 40 anos, não tinha"


@pytest.fixture
def demo(db):
    criar_demo(log=lambda *_: None)


def _c(u):
    c = Client(enforce_csrf_checks=True)
    api_login(c, u, "demo1234")
    return c


def _msg(c, texto, **extra):
    return c.post(
        "/api/agente/mensagens", {"texto": texto, **extra}, content_type="application/json"
    ).json()


def test_lista_so_minhas_conversas_da_loja(demo):
    g, d = _c("gerente.centro"), _c("dono.centro")
    _msg(g, FRASE)
    _msg(d, "quem compra mais?")
    lista = g.get("/api/agente/conversas").json()
    assert len(lista) == 1 and lista[0]["titulo"].startswith("procurou calça")
    assert lista[0]["turnos"] == 1


def test_abrir_conversa_traz_propostas_e_passos(demo):
    g = _c("gerente.centro")
    r = _msg(g, FRASE)
    assert "Preparou registro de procura" in r["passos"]
    conv = g.get(f"/api/agente/conversas/{r['sessao_id']}").json()
    voce, agente = conv["falas"]
    assert voce["papel"] == "voce" and agente["papel"] == "agente"
    assert agente["passos"] == r["passos"]
    assert [p["id"] for p in agente["propostas"]] == [p["id"] for p in r["propostas"]]


def test_conversa_de_outra_pessoa_404(demo):
    r = _msg(_c("gerente.centro"), FRASE)
    d = _c("dono.centro")  # mesma loja, outra pessoa
    assert d.get(f"/api/agente/conversas/{r['sessao_id']}").status_code == 404
    assert d.delete(f"/api/agente/conversas/{r['sessao_id']}").status_code == 404


def test_conversa_de_outra_loja_404(demo):
    r = _msg(_c("gerente.centro"), FRASE)
    n = _c("gerente.norte")
    assert n.get(f"/api/agente/conversas/{r['sessao_id']}").status_code == 404


def test_apagar_limpa_texto_e_rejeita_pendentes(demo):
    g = _c("gerente.centro")
    r = _msg(g, FRASE)
    pid = r["propostas"][0]["id"]
    assert g.delete(f"/api/agente/conversas/{r['sessao_id']}").status_code == 204
    assert SessaoAgente.objects.get(pk=r["sessao_id"]).historico == []
    assert PropostaAgente.objects.get(pk=pid).status == "rejeitada"
    assert g.get("/api/agente/conversas").json() == []


@pytest.fixture
def claude(settings, monkeypatch):
    settings.MIDIA_IA_HABILITADA = True
    settings.MIDIA_IA_PROVEDOR = "claude"
    settings.MIDIA_IA_API_KEY = "teste"
    settings.MIDIA_IA_MODELO = "claude-haiku-4-5"

    def montar(*passos):
        falso = Falso(passos)
        monkeypatch.setattr(anthropic, "Anthropic", lambda **_: falso)
        return falso

    return montar


def test_janela_do_llm_tem_so_role_e_content(demo, claude):
    falso = claude(_fim("Oi."), _fim("De novo."))
    g = _c("gerente.centro")
    r = _msg(g, "quem compra mais?")
    _msg(g, "e no sábado?", sessao_id=r["sessao_id"])
    mensagens = falso.chamadas[-1]["messages"]
    assert mensagens[0]["role"] == "user"
    assert all(set(m) == {"role", "content"} for m in mensagens)


def test_guarda_100_mas_envia_6(demo, claude, settings):
    loja = Loja.objects.get(nome="Loja Demo Centro")
    user = Vinculo.objects.get(loja=loja, papel="gerente").user
    longo = []
    for i in range(30):
        longo += [
            {"role": "user", "content": f"pergunta {i}", "em": None},
            {"role": "assistant", "content": f"resposta {i}", "em": None, "passos": []},
        ]
    s = SessaoAgente.objects.create(loja=loja, usuario=user, historico=longo, turnos=30)
    falso = claude(_fim("Ok."))
    _msg(_c("gerente.centro"), "e agora?", sessao_id=s.id)
    enviadas = falso.chamadas[-1]["messages"]
    assert len(enviadas) == settings.MIDIA_AGENTE_HISTORICO + 1  # janela + fala atual
    assert enviadas[0] == {"role": "user", "content": "pergunta 27"}
    s.refresh_from_db()
    assert len(s.historico) == 62  # nada se perdeu para a tela
