from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.db import transaction
from django.test import Client
from django.utils import timezone

from apps.acoes.models import PlanoAcao
from apps.contas.models import Loja
from apps.core.demo import criar_demo
from apps.estoque.models import SnapshotEstoque
from apps.notificacoes import eventos as ev
from apps.notificacoes.models import Notificacao
from conftest import api_login


# ── barramento ────────────────────────────────────────────────────────────────
def test_publicador_nao_conhece_observador_e_erro_nao_propaga(
    duas_lojas, django_capture_on_commit_callbacks, monkeypatch
):
    chamados = []
    quebrado = lambda e: (_ for _ in ()).throw(RuntimeError("falhei"))  # noqa: E731
    espiao = lambda e: chamados.append(e.tipo)  # noqa: E731
    monkeypatch.setitem(ev._OBSERVADORES, ev.ACAO_ATRASADA, [quebrado, espiao])
    with django_capture_on_commit_callbacks(execute=True):
        ev.publicar(
            ev.ACAO_ATRASADA, duas_lojas["loja_a"], titulo="x", responsavel="y", prazo="01/01"
        )
    assert chamados == [ev.ACAO_ATRASADA]  # o observer quebrado não impediu o outro


def test_rollback_nao_notifica(duas_lojas, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        try:
            with transaction.atomic():
                ev.publicar(ev.ESTOQUE_DESATUALIZADO, duas_lojas["loja_a"], horas=99)
                raise RuntimeError("desfaz")
        except RuntimeError:
            pass
    assert not Notificacao.objects.exists()


def test_tipo_desconhecido_falha_cedo(duas_lojas):
    with pytest.raises(ValueError):
        ev.publicar("inventado", duas_lojas["loja_a"])


def test_agrupa_repeticao_em_contador(duas_lojas, django_capture_on_commit_callbacks):
    loja = duas_lojas["loja_a"]
    with django_capture_on_commit_callbacks(execute=True):
        ev.publicar(ev.ESTOQUE_DESATUALIZADO, loja, chave="estoque", horas=80)
    with django_capture_on_commit_callbacks(execute=True):
        ev.publicar(ev.ESTOQUE_DESATUALIZADO, loja, chave="estoque", horas=81)
    n = Notificacao.objects.get()
    assert n.contador == 2 and "81 h" in n.titulo


# ── eventos reais disparados pelos services ───────────────────────────────────
@pytest.fixture
def demo(db):
    criar_demo(log=lambda *_: None)
    return Loja.objects.get(nome="Loja Demo Centro")


def _cli(u):
    c = Client(enforce_csrf_checks=True)
    api_login(c, u, "demo1234")
    return c


def test_balcao_dispara_limiar_de_procuras(demo, django_capture_on_commit_callbacks):
    ana = _cli("ana")
    prod = ana.get("/api/catalogo/?q=calca jeans").json()[0]
    with django_capture_on_commit_callbacks(execute=True):
        ana.post(
            "/api/demandas/",
            {"produto_id": prod["id"], "tamanho": "42", "cor": "Azul", "motivo": "indisponivel"},
            content_type="application/json",
        )
    n = Notificacao.objects.get(tipo=ev.DEMANDA_LIMIAR)
    assert "procuraram Calça jeans Azul 42" in n.titulo and n.link == "/demanda"


def test_motor_e_agente_disparam(demo, django_capture_on_commit_callbacks):
    g = _cli("gerente.centro")
    with django_capture_on_commit_callbacks(execute=True):
        g.post("/api/oportunidades/gerar")
    assert Notificacao.objects.filter(tipo=ev.OPORTUNIDADE_NOVA).count() >= 1
    antes = Notificacao.objects.filter(tipo=ev.OPORTUNIDADE_NOVA).count()
    with django_capture_on_commit_callbacks(execute=True):
        g.post("/api/oportunidades/gerar")  # mesmas oportunidades: não repete
    assert Notificacao.objects.filter(tipo=ev.OPORTUNIDADE_NOVA).count() == antes
    with django_capture_on_commit_callbacks(execute=True):
        g.post("/api/agente/prospeccao")
    assert Notificacao.objects.filter(tipo=ev.CAMPANHA_PROPOSTA, link="/agente").exists()


def test_comando_verificar_prazos(demo, django_capture_on_commit_callbacks):
    PlanoAcao.objects.create(
        loja=demo,
        titulo="Repor CAM-AZ-M",
        responsavel="Ana",
        prazo=timezone.localdate() - timedelta(days=2),
        indicador="x",
    )
    SnapshotEstoque.objects.filter(loja=demo).update(
        capturado_em=timezone.now() - timedelta(hours=200)
    )
    with django_capture_on_commit_callbacks(execute=True):
        call_command("verificar_prazos", stdout=StringIO())
    atrasada = Notificacao.objects.get(tipo=ev.ACAO_ATRASADA)
    assert atrasada.nivel == "erro" and atrasada.link.startswith("/acoes/")
    assert Notificacao.objects.filter(tipo=ev.ESTOQUE_DESATUALIZADO, loja=demo).exists()


def test_cliente_comprou_apos_contato(demo, django_capture_on_commit_callbacks):
    from django.core.files.uploadedfile import SimpleUploadedFile

    g = _cli("gerente.centro")
    camp = next(
        c for c in g.post("/api/agente/prospeccao").json() if "Camisa social" in c["titulo"]
    )
    p = camp["propostas"][0]
    g.post(f"/api/agente/propostas/{p['id']}/confirmar", {}, content_type="application/json")
    g.post(f"/api/agente/propostas/{p['id']}/enviada")
    agora = (timezone.localtime() + timedelta(minutes=1)).isoformat(timespec="seconds")
    csv = f"pedido_id;item_id;data_hora;sku;categoria;quantidade;receita_item;status;cliente_ref\nX1;1;{agora};CSO-BR-G;Camisas;1;129,90;concluida;{p['cliente']['ref']}\n"
    lote = g.post(
        "/api/importacoes/preview",
        {"arquivo": SimpleUploadedFile("c.csv", csv.encode()), "tipo": "vendas"},
    ).json()
    with django_capture_on_commit_callbacks(execute=True):
        g.post(f"/api/importacoes/{lote['id']}/confirmar")
    n = Notificacao.objects.get(tipo=ev.CLIENTE_COMPROU)
    assert n.nivel == "sucesso" and p["cliente"]["ref"] in n.texto
    assert p["cliente"]["nome"] not in n.texto  # sem dado pessoal na notificação


# ── API: papel, loja e leitura por usuário ────────────────────────────────────
def test_api_respeita_loja_papel_e_leitura(demo, django_capture_on_commit_callbacks):
    norte = Loja.objects.get(nome="Loja Demo Norte")
    with django_capture_on_commit_callbacks(execute=True):
        ev.publicar(ev.ESTOQUE_DESATUALIZADO, demo, chave="estoque", horas=90)
        ev.publicar(ev.ESTOQUE_DESATUALIZADO, norte, chave="estoque", horas=91)
    g, dono = _cli("gerente.centro"), _cli("dono.centro")
    lista = g.get("/api/notificacoes/").json()
    assert [n["titulo"] for n in lista] == ["Estoque desatualizado há 90 h"]  # não vê a Norte
    assert g.get("/api/notificacoes/contagem").json()["nao_lidas"] == 1
    g.post(f"/api/notificacoes/{lista[0]['id']}/ler")
    assert g.get("/api/notificacoes/contagem").json()["nao_lidas"] == 0
    assert dono.get("/api/notificacoes/contagem").json()["nao_lidas"] == 1  # leitura é por pessoa
    assert (
        _cli("ana").get("/api/notificacoes/").json() == []
    )  # atendente não recebe aviso de gestão
    outra = Notificacao.objects.get(loja=norte)
    assert g.post(f"/api/notificacoes/{outra.id}/ler").status_code == 404
