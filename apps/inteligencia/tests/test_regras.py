"""Regras puras: um cenário que dispara, um que não dispara e um bloqueado (§11 convenções)."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from apps.inteligencia.contexto import (
    ContextoAnalise,
    InfoSku,
    Limiares,
    RegistroDemanda,
    SaldoEstoque,
    VendaItem,
)
from apps.inteligencia.motor import avaliar
from apps.inteligencia.priorizacao import priorizar
from apps.inteligencia.regras.a_lacuna_mix import RegraLacunaMix
from apps.inteligencia.regras.b_pouca_saida import RegraPoucaSaida
from apps.inteligencia.regras.c_padrao_publico import RegraPadraoPublico, RegraRecorrencia

TZ = ZoneInfo("America/Araguaina")
AGORA = datetime(2026, 11, 13, 12, 0, tzinfo=TZ)


def ctx(**kw) -> ContextoAnalise:
    base = {
        "loja_id": 1,
        "janela_inicio": date(2026, 10, 15),
        "janela_fim": date(2026, 11, 13),
        "agora": AGORA,
        "limiares": Limiares(),
        "catalogo": {"CAM-AZ-M": InfoSku("Camiseta Azul M", "Camisetas")},
        "inicio_historico": AGORA - timedelta(days=90),
    }
    return ContextoAnalise(**(base | kw))


def demandas(sku, n, rotulo="Camiseta Azul M"):
    return tuple(
        RegistroDemanda(
            AGORA - timedelta(days=i % 6), sku, rotulo, "Camisetas", "M", "Azul", "indisponivel"
        )
        for i in range(n)
    )


def saldo(sku, n, horas=18):
    return SaldoEstoque(sku, n, AGORA - timedelta(hours=horas))


# ── Regra A ───────────────────────────────────────────────────────────────────
def test_a_dispara_com_saldo_zero():
    r = RegraLacunaMix().avaliar(
        ctx(demandas=demandas("CAM-AZ-M", 9), estoque=(saldo("CAM-AZ-M", 0),))
    )
    assert r.status == "suficiente"
    op = r.oportunidades[0]
    assert op.titulo == "Investigar reposição: Camiseta Azul M"
    assert op.evidencias[0].amostra == 9
    assert "9 atendimentos" in op.limitacao


def test_a_nao_dispara_com_estoque():
    r = RegraLacunaMix().avaliar(
        ctx(demandas=demandas("CAM-AZ-M", 9), estoque=(saldo("CAM-AZ-M", 4),))
    )
    assert r.oportunidades == []


def test_a_nao_dispara_abaixo_de_n():
    r = RegraLacunaMix().avaliar(
        ctx(demandas=demandas("CAM-AZ-M", 4), estoque=(saldo("CAM-AZ-M", 0),))
    )
    assert r.oportunidades == []


def test_a_bloqueada_sem_demanda():
    r = RegraLacunaMix().avaliar(ctx())
    assert r.status == "bloqueada" and r.como_liberar


def test_a_estoque_velho_vira_amostra_limitada():
    r = RegraLacunaMix().avaliar(
        ctx(demandas=demandas("CAM-AZ-M", 9), estoque=(saldo("CAM-AZ-M", 0, horas=100),))
    )
    assert r.status == "amostra_limitada"
    assert "desatualizado" in r.oportunidades[0].limitacao


def test_a_variacao_ausente_do_catalogo():
    r = RegraLacunaMix().avaliar(
        ctx(demandas=demandas(None, 6, "Camiseta Verde M"), estoque=(saldo("X", 1),))
    )
    assert r.oportunidades[0].alvo["sku"] is None


# ── Regra B ───────────────────────────────────────────────────────────────────
def test_b_dispara_sem_venda():
    c = ctx(estoque=(saldo("CIN-MA-U", 14),), ultima_venda={"CIN-MA-U": AGORA - timedelta(days=30)})
    r = RegraPoucaSaida().avaliar(c)
    assert r.status == "suficiente"
    assert "30 dias" in r.oportunidades[0].titulo


def test_b_nao_dispara_com_venda_recente():
    c = ctx(estoque=(saldo("CIN-MA-U", 14),), ultima_venda={"CIN-MA-U": AGORA - timedelta(days=3)})
    assert RegraPoucaSaida().avaliar(c).oportunidades == []


def test_b_bloqueada_estoque_velho():
    c = ctx(estoque=(saldo("CIN-MA-U", 14, horas=100),))
    r = RegraPoucaSaida().avaliar(c)
    assert r.status == "bloqueada" and "100 h" in r.motivo


# ── Regra C ───────────────────────────────────────────────────────────────────
def vendas_calcas(n_sabado, n_outros, cliente=None):
    sab = datetime(2026, 11, 7, 10, 30, tzinfo=TZ)  # sábado
    ter = datetime(2026, 11, 10, 15, 0, tzinfo=TZ)
    vs = [
        VendaItem(i, sab, "CJE-AZ-42", "Calças", 1, Decimal("179.90"), cliente)
        for i in range(n_sabado)
    ]
    vs += [
        VendaItem(1000 + i, ter, "CJE-AZ-42", "Calças", 1, Decimal("179.90"), cliente)
        for i in range(n_outros)
    ]
    return tuple(vs)


def test_c_dispara_concentracao():
    r = RegraPadraoPublico().avaliar(ctx(vendas=vendas_calcas(15, 25)))
    assert r.status == "suficiente"
    assert (
        r.oportunidades[0].titulo.startswith("Terça 14–16h")
        or "Sábado" in r.oportunidades[0].titulo
    )


def test_c_nao_dispara_pouco_volume():
    assert RegraPadraoPublico().avaliar(ctx(vendas=vendas_calcas(5, 5))).oportunidades == []


def test_c_bloqueada_sem_vendas():
    assert RegraPadraoPublico().avaliar(ctx()).status == "bloqueada"


def test_recorrencia_bloqueada_sem_cobertura():
    r = RegraRecorrencia().avaliar(ctx(vendas=vendas_calcas(10, 10)))
    assert r.status == "bloqueada" and "0%" in r.motivo


def test_recorrencia_baixa_dispara():
    vs = tuple(VendaItem(i, AGORA, "X", "Calças", 1, Decimal("10"), f"C-{i}") for i in range(40))
    r = RegraRecorrencia().avaliar(ctx(vendas=vs))
    assert r.oportunidades and "0%" in r.oportunidades[0].titulo


# ── Priorização e motor ───────────────────────────────────────────────────────
def test_priorizacao_corta_em_3_e_ordena():
    c = ctx(
        demandas=demandas("CAM-AZ-M", 9),
        estoque=(
            saldo("CAM-AZ-M", 0),
            saldo("CIN-MA-U", 14),
            saldo("CSO-BR-G", 10),
            saldo("BER", 20),
        ),
        ultima_venda={},
        vendas=vendas_calcas(15, 25),
    )
    selecionadas, bloqueios, _ = avaliar(c)
    assert len(selecionadas) == 3
    assert selecionadas[0][0].regra == "A_LACUNA_MIX"
    assert [b["regra"] for b in bloqueios] == ["C_RECORRENCIA"]


def test_priorizar_vazio():
    assert priorizar([]) == []
