from datetime import timedelta

import pytest
from django.test import Client
from django.utils import timezone

from apps.agente.models import ChamadaFerramenta, PropostaAgente
from apps.agente.privacidade import mascarar, restaurar
from apps.clientes.models import Cliente
from apps.core.demo import criar_demo
from apps.publico.models import DemandaNaoAtendida
from conftest import api_login


@pytest.fixture
def demo(db):
    criar_demo(log=lambda *_: None)


def _c(username):
    c = Client(enforce_csrf_checks=True)
    api_login(c, username, "demo1234")
    return c


def _msg(c, texto):
    return c.post("/api/agente/mensagens", {"texto": texto}, content_type="application/json")


def test_mascara_e_restaura():
    t, mapa = mascarar("zap (63) 98877-1122 cpf 123.456.789-09 mail a@b.com")
    assert "98877" not in t and "123.456" not in t and "a@b.com" not in t
    assert restaurar(t, mapa) == "zap (63) 98877-1122 cpf 123.456.789-09 mail a@b.com"


def test_balcao_propoe_e_so_grava_ao_confirmar(demo):
    c = _c("ana")
    antes = DemandaNaoAtendida.objects.count()
    r = _msg(c, "cliente procurou calça jeans 42, uns 40 anos, não tinha").json()
    p = r["propostas"][0]
    assert p["tipo"] == "demanda" and p["status"] == "pendente"
    assert p["dados"]["tamanho"] == "42" and p["dados"]["motivo"] == "indisponivel"
    assert p["dados"]["faixa_etaria"] == "35_44" and p["campos_incertos"] == []
    assert DemandaNaoAtendida.objects.count() == antes  # propõe, não grava
    r = c.post(
        f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json"
    ).json()
    assert r["status"] == "confirmada" and r["objeto_criado"].startswith("demanda:")
    d = DemandaNaoAtendida.objects.latest("id")
    assert d.variante.sku == "CJE-AZ-42" and d.faixa_etaria == "35_44"
    assert ChamadaFerramenta.objects.filter(ferramenta="propor_demanda").exists()
    # não confirma duas vezes
    assert (
        c.post(
            f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json"
        ).status_code
        == 409
    )


def test_frase_ambigua_marca_incerto(demo):
    p = _msg(_c("ana"), "o cliente queria aquele negócio").json()["propostas"][0]
    assert "produto" in p["campos_incertos"] and "motivo" in p["campos_incertos"]


def test_atendente_nao_usa_ferramentas_de_gerente(demo):
    c = _c("ana")
    nomes = {f["nome"] for f in c.get("/api/agente/ferramentas").json()}
    assert nomes == {"buscar_variante", "propor_demanda"}
    assert _msg(c, "quero vender a camisa parada").status_code == 403
    assert c.post("/api/agente/prospeccao").status_code == 403
    assert c.get("/api/clientes/").status_code == 403


def test_cadastro_de_cliente_pela_frase(demo):
    c = _c("gerente.centro")
    p = _msg(
        c,
        "cadastrar cliente Pedro Alves whatsapp (63) 98877-1122, uns 30 anos, veste M, gosta de calças, autoriza mensagem",
    ).json()["propostas"][0]
    assert p["tipo"] == "cliente"
    assert p["dados"]["nome"] == "Pedro Alves" and p["dados"]["whatsapp"] == "5563988771122"
    assert p["dados"]["faixa_etaria"] == "25_34" and p["dados"]["consentimento_contato"] is True
    assert p["dados"]["categorias_interesse"] == ["Calças"]
    c.post(f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json")
    cli = Cliente.objects.get(whatsapp="5563988771122")
    assert cli.origem == "agente" and cli.consentimento_em


def test_sessao_de_cliente_nunca_usa_llm(demo, settings):
    settings.MIDIA_IA_HABILITADA = True
    settings.MIDIA_IA_PROVEDOR = "claude"
    r = _msg(_c("gerente.centro"), "cadastrar cliente Joao Lima zap 63 99999 0000").json()
    assert r["provedor"] == "offline"


def test_prospeccao_so_consentidos_e_respeita_descanso(demo):
    c = _c("gerente.centro")
    camps = c.post("/api/agente/prospeccao").json()
    assert camps, "seed planta produto parado com clientes"
    camp = next(x for x in camps if "Camisa social" in x["titulo"])
    ids = [p["cliente"]["id"] for p in camp["propostas"]]
    assert all(Cliente.objects.get(pk=i).consentimento_contato for i in ids)
    assert all(p["motivos"] for p in camp["propostas"])
    # aprovar gera link; enviar inicia descanso
    p = camp["propostas"][0]
    r = c.post(
        f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json"
    ).json()
    assert r["dados"]["link"].startswith("https://wa.me/55") and "SAIR" in r["dados"]["mensagem"]
    c.post(f"/api/agente/propostas/{p['id']}/enviada")
    cli = Cliente.objects.get(pk=p["cliente"]["id"])
    assert cli.ultimo_contato_em > timezone.now() - timedelta(minutes=1)
    # nova rodada não repete cliente em descanso nem com proposta pendente
    PropostaAgente.objects.filter(status="pendente").update(status="rejeitada")
    novas = c.post("/api/agente/prospeccao").json()
    todos = [q["cliente"]["id"] for x in novas for q in x["propostas"]]
    assert cli.id not in todos


def test_cliente_sem_consentimento_nao_recebe(demo):
    Cliente.objects.update(consentimento_contato=False)
    assert _c("gerente.centro").post("/api/agente/prospeccao").json() == []


def test_proposta_de_outra_loja_404(demo):
    a = _c("gerente.centro")
    p = _msg(a, "procurou camiseta azul M sem estoque").json()["propostas"][0]
    n = _c("gerente.norte")
    assert (
        n.post(
            f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json"
        ).status_code
        == 404
    )
