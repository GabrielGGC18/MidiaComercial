"""Fluxo ponta a ponta sobre o seed: oportunidades → criar ação → medir → concluir."""

import pytest
from django.test import Client
from django.utils import timezone

from apps.core.demo import criar_demo
from conftest import api_login


@pytest.fixture
def gerente_centro(db):
    criar_demo(log=lambda *_: None)
    c = Client(enforce_csrf_checks=True)
    api_login(c, "gerente.centro", "demo1234")
    return c


def test_fluxo_completo(gerente_centro):
    c = gerente_centro
    painel = c.get("/api/oportunidades/").json()
    assert 1 <= len(painel["cartoes"]) <= 3
    primeiro = painel["cartoes"][0]
    assert primeiro["regra"] == "A_LACUNA_MIX"
    assert primeiro["evidencias"] and primeiro["limitacao"] and primeiro["explicacao"]

    prazo = (timezone.localdate()).isoformat()
    r = c.post(
        "/api/acoes/",
        {"oportunidade_id": primeiro["id"], "responsavel": "Ana", "prazo": prazo},
        content_type="application/json",
    )
    assert r.status_code == 201, r.content
    plano = r.json()
    assert plano["titulo"] == primeiro["titulo"]
    assert plano["indicador"] == primeiro["medicao_sugerida"]

    # não cria dois planos para a mesma oportunidade
    r = c.post(
        "/api/acoes/",
        {"oportunidade_id": primeiro["id"], "responsavel": "Ana", "prazo": prazo},
        content_type="application/json",
    )
    assert r.status_code == 409

    sug = c.get(f"/api/acoes/{plano['id']}/medicao-sugerida").json()
    assert sug["unidade"] == "registros de falta"
    assert float(sug["valor_antes"]) >= 5

    r = c.post(
        f"/api/acoes/{plano['id']}/medicoes",
        {k: sug[k] for k in sug if k not in ("unidade", "periodo_depois_completo")},
        content_type="application/json",
    )
    assert r.status_code == 201 and len(r.json()["medicoes"]) == 1

    r = c.patch(
        f"/api/acoes/{plano['id']}", {"situacao": "descartada"}, content_type="application/json"
    )
    assert r.status_code == 409  # descartar exige justificativa
    r = c.patch(
        f"/api/acoes/{plano['id']}", {"situacao": "concluida"}, content_type="application/json"
    )
    assert r.json()["situacao"] == "concluida"

    # recalcular não repete alvo com plano
    painel2 = c.post("/api/oportunidades/gerar").json()
    assert all(o["titulo"] != primeiro["titulo"] or o["plano_id"] for o in painel2["cartoes"])


def test_descartar_oportunidade(gerente_centro):
    c = gerente_centro
    op = c.get("/api/oportunidades/").json()["cartoes"][-1]
    r = c.post(
        f"/api/oportunidades/{op['id']}/descartar",
        {"justificativa": "Fornecedor parou de fabricar"},
        content_type="application/json",
    )
    assert r.status_code == 200
    ids = [o["id"] for o in c.get("/api/oportunidades/").json()["cartoes"]]
    assert op["id"] not in ids


def test_publico_e_ranking(gerente_centro):
    c = gerente_centro
    p = c.get("/api/analises/publico").json()
    assert p["kpis"]["pedidos"] > 100
    assert p["categorias"][0]["participacao_receita"]
    assert p["recorrencia"]["status"] in ("suficiente", "amostra_limitada")
    rk = c.get("/api/demandas/ranking").json()
    assert rk["itens"][0]["sku"] == "CAM-AZ-M" and rk["itens"][0]["total"] == 9


def test_balcao_registra_e_desfaz(db):
    criar_demo(log=lambda *_: None)
    c = Client(enforce_csrf_checks=True)
    api_login(c, "ana", "demo1234")
    prod = c.get("/api/catalogo/?q=camiseta azul").json()[0]
    assert "M" in prod["tamanhos"]
    r = c.post(
        "/api/demandas/",
        {"produto_id": prod["id"], "tamanho": "M", "cor": "Azul", "motivo": "indisponivel"},
        content_type="application/json",
    )
    assert r.status_code == 201 and r.json()["sku"] == "CAM-AZ-M"
    # combinação inexistente vira "variação ausente" em texto
    r = c.post(
        "/api/demandas/",
        {"produto_id": prod["id"], "tamanho": "XGG", "cor": "Azul", "motivo": "variacao_ausente"},
        content_type="application/json",
    )
    assert r.json()["no_catalogo"] is False
    assert c.delete(f"/api/demandas/{r.json()['id']}").status_code == 204


def test_importa_csv_exemplo(gerente_centro):
    from django.core.files.uploadedfile import SimpleUploadedFile

    c = gerente_centro
    conteudo = c.get("/api/importacoes/exemplo").content
    arq = SimpleUploadedFile("ex.csv", conteudo, content_type="text/csv")
    lote = c.post("/api/importacoes/preview", {"arquivo": arq, "tipo": "vendas"}).json()
    assert lote["linhas_rejeitadas"] == 3
    assert lote["linhas_duplicadas"] == 2
    assert lote["linhas_ok"] == 20
