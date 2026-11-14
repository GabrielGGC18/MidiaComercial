"""Garantias do motor e da API de oportunidades (docs/18):
GET só lê, análises imutáveis, recálculo idempotente, campos estruturados, adiar,
uma ação por alvo entre análises, loja nova sem quebrar."""

import pytest
from django.db import IntegrityError, transaction
from django.test import Client
from django.utils import timezone

from apps.contas.models import Loja, Vinculo
from apps.core.demo import criar_demo
from apps.inteligencia import motor
from apps.inteligencia.models import ExecucaoMotor, Oportunidade
from apps.publico.models import DemandaNaoAtendida
from conftest import api_login

pytestmark = pytest.mark.django_db


@pytest.fixture
def c(db):
    criar_demo(log=lambda *_: None)
    cli = Client(enforce_csrf_checks=True)
    api_login(cli, "gerente.centro", "demo1234")
    return cli


def _gerar(c):
    r = c.post("/api/oportunidades/gerar")
    assert r.status_code == 200, r.content
    return r.json()


def test_get_sem_analise_nao_grava_nada(c):
    p = c.get("/api/oportunidades/").json()
    assert p["estado"] == "sem_execucao" and p["cartoes"] == [] and p["execucao"] is None
    assert "estoque" in p["fontes"]
    c.get("/api/oportunidades/")
    assert ExecucaoMotor.objects.count() == 0 and Oportunidade.objects.count() == 0


def test_recalcular_sem_mudanca_devolve_a_mesma_analise(c):
    a = _gerar(c)
    b = _gerar(c)
    assert b["reaproveitada"] and b["execucao"]["id"] == a["execucao"]["id"]
    assert ExecucaoMotor.objects.filter(loja__nome="Loja Demo Centro").count() == 1
    assert [o["id"] for o in b["cartoes"]] == [o["id"] for o in a["cartoes"]]


def test_dado_novo_marca_desatualizada_e_recalculo_preserva_a_anterior(c):
    a = _gerar(c)
    antigo = a["cartoes"][0]
    loja = Loja.objects.get(nome="Loja Demo Centro")
    DemandaNaoAtendida.objects.create(
        loja=loja,
        produto_texto="Boné preto",
        motivo="indisponivel",
        registrado_em=timezone.now(),
        registrado_por=Vinculo.objects.filter(loja=loja).first().user,
    )
    p = c.get("/api/oportunidades/").json()
    assert p["execucao"]["desatualizada"] is True  # tem dado novo desde a análise

    b = _gerar(c)
    assert not b["reaproveitada"] and b["execucao"]["id"] != a["execucao"]["id"]
    assert b["execucao"]["desatualizada"] is False
    # a análise anterior e seus cartões continuam lá (auditoria, detalhe aberto)
    assert ExecucaoMotor.objects.filter(pk=a["execucao"]["id"]).exists()
    d = c.get(f"/api/oportunidades/{antigo['id']}").json()
    assert d["id"] == antigo["id"] and d["da_analise_vigente"] is False


def test_cartao_traz_campos_estruturados_em_linguagem_de_loja(c):
    op = next(o for o in _gerar(c)["cartoes"] if o["regra"] == "A_LACUNA_MIX")
    assert op["resumo"] and op["passos"] and op["estado_decisao"] == "aberta"
    assert set(op["acoes_disponiveis"]) == {"criar_acao", "descartar", "adiar"}
    procura = op["numeros"][0]
    assert procura["rotulo"] == "registros de procura" and isinstance(procura["valor"], str)
    assert op["frescor"]["limite_horas"] == 72 and "ok" in op["frescor"]
    assert op["alvo"]["sku"] not in op["medicao_sugerida"]  # sem SKU no texto para o lojista
    assert op["chave"].startswith("A_LACUNA_MIX:")
    # a limitação não se repete na explicação
    assert op["limitacao"] not in op["explicacao"]


def test_adiar_esconde_e_recalculo_nao_traz_de_volta(c):
    op = _gerar(c)["cartoes"][0]
    r = c.post(f"/api/oportunidades/{op['id']}/adiar", {"dias": 3}, content_type="application/json")
    assert r.status_code == 200 and r.json()["estado_decisao"] == "adiada"
    p = c.get("/api/oportunidades/").json()
    assert op["id"] not in [o["id"] for o in p["cartoes"]] and p["tratadas"] == 1
    novo = _gerar(c)  # adiar muda a revisão: recalcula, mas sem o alvo adiado
    assert op["chave"] not in [o["chave"] for o in novo["cartoes"]]
    r = c.post(
        f"/api/oportunidades/{op['id']}/adiar", {"dias": 99}, content_type="application/json"
    )
    assert r.status_code == 422  # no máximo 14 dias


def test_uma_acao_aberta_por_alvo_mesmo_entre_analises(c):
    op = _gerar(c)["cartoes"][0]
    loja = Loja.objects.get(nome="Loja Demo Centro")
    o = Oportunidade.objects.get(pk=op["id"])
    # o mesmo alvo numa análise mais nova (cartão antigo ainda aberto em outra aba)
    ex2 = ExecucaoMotor.objects.create(
        loja=loja, janela_inicio=o.execucao.janela_inicio, janela_fim=o.execucao.janela_fim
    )
    gemeo = Oportunidade.objects.create(
        loja=loja, execucao=ex2, regra=o.regra, versao_regra=o.versao_regra, status=o.status,
        titulo=o.titulo, acao_sugerida=o.acao_sugerida, limitacao=o.limitacao,
        medicao_sugerida=o.medicao_sugerida, alvo=o.alvo, chave=o.chave, prioridade=1,
    )  # fmt: skip
    prazo = timezone.localdate().isoformat()
    for alvo, esperado in ((o.id, 201), (gemeo.id, 409)):
        r = c.post(
            "/api/acoes/",
            {"oportunidade_id": alvo, "responsavel": "Ana", "prazo": prazo},
            content_type="application/json",
        )
        assert r.status_code == esperado, r.content


def test_duas_publicacoes_com_a_mesma_revisao_sao_barradas(c):
    loja = Loja.objects.get(nome="Loja Demo Centro")
    hoje = timezone.localdate()
    dados = dict(
        loja=loja, janela_inicio=hoje, janela_fim=hoje, revisao_dados="r1", versao_motor="2"
    )
    ExecucaoMotor.objects.create(**dados)
    with pytest.raises(IntegrityError), transaction.atomic():
        ExecucaoMotor.objects.create(**dados)


def test_corrida_no_calculo_devolve_a_analise_ja_publicada(c, monkeypatch):
    loja = Loja.objects.get(nome="Loja Demo Centro")
    primeira = motor.calcular(loja)
    # a 2ª requisição não viu a 1ª no início (corrida): a publicação detecta e reaproveita
    monkeypatch.setattr(motor, "vigente", lambda _loja: None)
    segunda = motor.calcular(loja)
    assert segunda.reaproveitada and segunda.execucao.id == primeira.execucao.id
    assert ExecucaoMotor.objects.filter(loja=loja).count() == 1


def test_loja_nova_gera_sem_quebrar(django_user_model):
    loja = Loja.objects.create(nome="Loja Nova")
    u = django_user_model.objects.create_user("dono.nova", password="x")
    Vinculo.objects.create(user=u, loja=loja, papel="dono")
    cli = Client(enforce_csrf_checks=True)
    api_login(cli, "dono.nova")
    p = cli.post("/api/oportunidades/gerar").json()  # antes: Decimal < str na configuração
    assert p["estado"] == "pronto" and p["cartoes"] == [] and p["bloqueios"]
