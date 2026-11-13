"""Teste obrigatório P0-1: usuário da loja A não acessa dados da loja B, nem trocando IDs."""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from django.test import Client
from django.utils import timezone

from apps.acoes.models import PlanoAcao
from apps.comercio.models import Produto
from apps.contas.models import Vinculo
from apps.importacao.models import LoteImportacao
from apps.inteligencia.models import ExecucaoMotor, Oportunidade
from conftest import api_login


def test_da_loja_sem_loja_bloqueia(db):
    with pytest.raises(PermissionDenied):
        Produto.objects.da_loja(None)


def test_da_loja_filtra_por_loja(duas_lojas):
    a, b = duas_lojas["loja_a"], duas_lojas["loja_b"]
    Produto.objects.create(loja=a, referencia="X", nome="X", categoria="C")
    Produto.objects.create(loja=b, referencia="Y", nome="Y", categoria="C")
    assert list(Produto.objects.da_loja(a).values_list("referencia", flat=True)) == ["X"]


def test_login_exige_csrf(duas_lojas):
    c = Client(enforce_csrf_checks=True)
    r = c.post(
        "/api/auth/login",
        {"username": "gerente_a", "password": "x"},
        content_type="application/json",
    )
    assert r.status_code == 403


def test_login_senha_errada(duas_lojas):
    assert api_login(Client(enforce_csrf_checks=True), "gerente_a", "errada").status_code == 401


def test_login_com_uma_loja_grava_sessao(cliente_a, duas_lojas):
    me = cliente_a.get("/api/me").json()
    assert me["loja"]["nome"] == "Loja A"
    assert me["papel"] == "gerente"
    assert [loja["nome"] for loja in me["lojas"]] == ["Loja A"]


def test_nao_troca_para_loja_alheia(cliente_a, duas_lojas):
    r = cliente_a.post(
        "/api/me/loja", {"loja_id": duas_lojas["loja_b"].id}, content_type="application/json"
    )
    assert r.status_code == 404
    assert cliente_a.get("/api/me").json()["loja"]["nome"] == "Loja A"


def test_sessao_adulterada_nao_vaza_loja(cliente_a, duas_lojas):
    s = cliente_a.session
    s["loja_id"] = duas_lojas["loja_b"].id
    s.save()
    assert cliente_a.get("/api/me").json()["loja"] is None
    r = cliente_a.get("/api/oportunidades/")
    assert r.status_code == 409 and r.json()["codigo"] == "sem_loja"


def test_api_exige_login(db):
    c = Client()
    assert c.get("/api/me").status_code == 401
    assert c.get("/api/oportunidades/").status_code == 401
    assert c.get("/api/saude").status_code == 200


def test_ids_de_outra_loja_dao_404(cliente_a, duas_lojas):
    b, user_b = duas_lojas["loja_b"], duas_lojas["user_b"]
    lote = LoteImportacao.objects.create(loja=b, tipo="vendas", arquivo_hash="h", criado_por=user_b)
    ex = ExecucaoMotor.objects.create(
        loja=b, janela_inicio=timezone.localdate(), janela_fim=timezone.localdate()
    )
    op = Oportunidade.objects.create(
        loja=b, execucao=ex, regra="A_LACUNA_MIX", versao_regra="1.0", status="suficiente",
        titulo="t", acao_sugerida="a", limitacao="l", prioridade=1,
    )  # fmt: skip
    plano = PlanoAcao.objects.create(
        loja=b, titulo="p", responsavel="r", prazo=timezone.localdate(), indicador="i"
    )
    assert cliente_a.get(f"/api/importacoes/{lote.id}").status_code == 404
    assert cliente_a.post(f"/api/importacoes/{lote.id}/confirmar").status_code == 404
    assert cliente_a.get(f"/api/oportunidades/{op.id}").status_code == 404
    assert (
        cliente_a.post(
            f"/api/oportunidades/{op.id}/descartar",
            {"justificativa": "xxx"},
            content_type="application/json",
        ).status_code
        == 404
    )
    assert cliente_a.get(f"/api/acoes/{plano.id}").status_code == 404
    assert (
        cliente_a.patch(
            f"/api/acoes/{plano.id}", {"situacao": "concluida"}, content_type="application/json"
        ).status_code
        == 404
    )
    assert cliente_a.post(
        "/api/acoes/", {"oportunidade_id": op.id, "responsavel": "x", "prazo": "2026-12-01"},
        content_type="application/json",
    ).status_code == 404  # fmt: skip


def test_demanda_com_produto_de_outra_loja(cliente_a, duas_lojas):
    p = Produto.objects.create(loja=duas_lojas["loja_b"], referencia="Z", nome="Z", categoria="C")
    r = cliente_a.post(
        "/api/demandas/", {"produto_id": p.id, "motivo": "preco"}, content_type="application/json"
    )
    assert r.status_code == 404


def test_atendente_nao_acessa_gestao(duas_lojas):
    u = get_user_model().objects.create_user("atend", password="x")
    Vinculo.objects.create(user=u, loja=duas_lojas["loja_a"], papel="atendente")
    c = Client(enforce_csrf_checks=True)
    api_login(c, "atend")
    assert c.get("/api/oportunidades/").status_code == 403
    assert c.get("/api/analises/publico").status_code == 403
    assert c.get("/api/catalogo/").status_code == 200
    r = c.post(
        "/api/demandas/", {"produto_texto": "Boné", "motivo": "indisponivel"},
        content_type="application/json",
    )  # fmt: skip
    assert r.status_code == 201


def test_usuario_com_duas_lojas_escolhe(duas_lojas):
    Vinculo.objects.create(user=duas_lojas["user_a"], loja=duas_lojas["loja_b"], papel="dono")
    c = Client(enforce_csrf_checks=True)
    me = api_login(c, "gerente_a").json()
    assert me["loja"] is None and len(me["lojas"]) == 2
    me = c.post(
        "/api/me/loja", {"loja_id": duas_lojas["loja_b"].id}, content_type="application/json"
    ).json()
    assert me["loja"]["nome"] == "Loja B" and me["papel"] == "dono"
