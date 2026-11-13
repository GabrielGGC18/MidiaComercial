import io

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from openpyxl import Workbook

from apps.clientes.models import Cliente
from apps.clientes.services import normalizar_whatsapp
from apps.core.demo import criar_demo
from apps.core.faixas import normalizar_faixa
from conftest import api_login

PLANILHA = (
    "Cliente_Ref;Nome;Telefone;Idade;Tamanho;Interesses;Aceita contato\n"
    "X-1;João Teste;(63) 99999-0001;30;M, 40;Calças;sim\n"
    ";Pedro Teste;63988880002;45-59;G;Camisas;não\n"
    "X-3;;123;;;;\n"
)


def test_normalizacoes():
    assert normalizar_whatsapp("(63) 99999-0001") == "5563999990001"
    assert normalizar_faixa("30") == "25_34" and normalizar_faixa("60+") == "60_mais"
    with pytest.raises(ValueError):
        normalizar_whatsapp("123")


@pytest.fixture
def gerente(duas_lojas):
    c = Client(enforce_csrf_checks=True)
    api_login(c, "gerente_a")
    return c


def _up(c, nome, conteudo):
    return c.post("/api/clientes/importar", {"arquivo": SimpleUploadedFile(nome, conteudo)})


def test_importa_csv_com_colunas_alternativas(gerente, duas_lojas):
    r = _up(gerente, "base.csv", PLANILHA.encode()).json()
    assert r["criados"] == 2 and len(r["rejeitados"]) == 1
    assert "WhatsApp inválido" in r["rejeitados"][0]["erro"]
    j = Cliente.objects.get(ref="X-1")
    assert j.faixa_etaria == "25_34" and j.tamanhos == ["M", "40"] and j.consentimento_contato
    # reimportar atualiza, não duplica
    r = _up(gerente, "base.csv", PLANILHA.replace("João Teste", "João Novo").encode()).json()
    assert r["criados"] == 0 and r["atualizados"] == 2
    assert Cliente.objects.get(ref="X-1").nome == "João Novo"


def test_importa_xlsx(gerente):
    wb = Workbook()
    ws = wb.active
    ws.append(["nome", "whatsapp", "faixa_etaria", "consentimento"])
    ws.append(["Ana Planilha", "63 97777-0003", "18-24", "x"])
    buf = io.BytesIO()
    wb.save(buf)
    r = _up(gerente, "base.xlsx", buf.getvalue()).json()
    assert r["criados"] == 1
    assert Cliente.objects.get(nome="Ana Planilha").faixa_etaria == "18_24"


def test_busca_pelos_preenchimentos_e_isolamento(gerente, duas_lojas):
    _up(gerente, "base.csv", PLANILHA.encode())
    Cliente.objects.create(loja=duas_lojas["loja_b"], ref="B-1", nome="Outra Loja", tamanhos=["M"])
    nomes = [c["nome"] for c in gerente.get("/api/clientes/?tamanho=M").json()]
    assert nomes == ["João Teste"]  # não vê cliente da loja B
    assert [c["nome"] for c in gerente.get("/api/clientes/?consentimento=false").json()] == [
        "Pedro Teste"
    ]
    assert [c["nome"] for c in gerente.get("/api/clientes/?q=pedro").json()] == ["Pedro Teste"]
    outro = Cliente.objects.get(ref="B-1")
    assert gerente.get(f"/api/clientes/{outro.id}").status_code == 404


def test_sair_revoga_consentimento(gerente):
    _up(gerente, "base.csv", PLANILHA.encode())
    j = Cliente.objects.get(ref="X-1")
    assert gerente.post(f"/api/clientes/{j.id}/sair").json()["consentimento_contato"] is False


def test_exporta_planilha_com_historico(db):
    criar_demo(log=lambda *_: None)
    c = Client(enforce_csrf_checks=True)
    api_login(c, "gerente.centro", "demo1234")
    csv = c.get("/api/clientes/exportar").content.decode("utf-8-sig")
    cab, *linhas = csv.strip().splitlines()
    assert cab.startswith("cliente_ref;nome;whatsapp;faixa_etaria")
    assert len(linhas) > 50


def test_periodos_e_faixas_no_publico(db):
    criar_demo(log=lambda *_: None)
    c = Client(enforce_csrf_checks=True)
    api_login(c, "gerente.centro", "demo1234")
    p = c.get("/api/analises/publico").json()
    calcas = next(x for x in p["periodos"]["por_categoria"] if x["categoria"] == "Calças")
    assert calcas["melhor_periodo"] == "Sábado 10–12h"
    assert len(p["periodos"]["fases_mes"]) == 3
    assert p["faixas"]["status"] in ("suficiente", "amostra_limitada")
    assert p["faixas"]["principal"]
