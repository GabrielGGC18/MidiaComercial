"""Plano de ação e medição (P0-6). Antes/depois mostra associação, não prova efeito."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.comercio.models import ItemPedido, Pedido
from apps.inteligencia.models import Oportunidade
from apps.publico.models import DemandaNaoAtendida
from apps.publico.services import rotulo_demanda

from .auditoria import registrar_evento
from .models import Medicao, PlanoAcao


class AcaoErro(Exception):
    pass


@transaction.atomic
def criar_plano(*, loja, usuario, dados) -> PlanoAcao:
    oportunidade = None
    if dados.oportunidade_id:
        oportunidade = (
            Oportunidade.objects.da_loja(loja)
            .select_for_update()
            .filter(pk=dados.oportunidade_id)
            .first()
        )
        if oportunidade is None:
            raise Oportunidade.DoesNotExist
        if PlanoAcao.objects.filter(oportunidade=oportunidade).exists():
            raise AcaoErro("Essa oportunidade já tem um plano de ação.")
        if oportunidade.descartada_em:
            raise AcaoErro("Essa oportunidade foi descartada.")
        # a mesma sugestão em outra análise (cartão antigo ainda aberto na tela) não vira
        # uma segunda ação para o mesmo alvo
        if (
            oportunidade.chave
            and PlanoAcao.objects.da_loja(loja)
            .filter(oportunidade__chave=oportunidade.chave, situacao=PlanoAcao.Situacao.ABERTA)
            .exists()
        ):
            raise AcaoErro("Já existe uma ação aberta para essa sugestão.")
    titulo = (dados.titulo or (oportunidade.titulo if oportunidade else "")).strip()
    indicador = (dados.indicador or (oportunidade.medicao_sugerida if oportunidade else "")).strip()
    if not titulo or not indicador:
        raise AcaoErro("Informe título e indicador da ação.")
    plano = PlanoAcao.objects.create(
        loja=loja,
        oportunidade=oportunidade,
        titulo=titulo[:200],
        responsavel=dados.responsavel.strip(),
        prazo=dados.prazo,
        indicador=indicador[:200],
    )
    registrar_evento(loja, usuario, "plano_criado", f"plano:{plano.pk}", titulo=plano.titulo)
    return plano


def atualizar_plano(*, loja, usuario, plano: PlanoAcao, dados) -> PlanoAcao:
    if dados.situacao and dados.situacao != plano.situacao:
        if plano.situacao != PlanoAcao.Situacao.ABERTA:
            raise AcaoErro("Só planos abertos podem mudar de situação.")
        if (
            dados.situacao == PlanoAcao.Situacao.DESCARTADA
            and not (dados.justificativa or "").strip()
        ):
            raise AcaoErro("Para descartar, explique o motivo.")
        plano.situacao = dados.situacao
        registrar_evento(
            loja, usuario, f"plano_{dados.situacao}", f"plano:{plano.pk}",
            justificativa=dados.justificativa or "",
        )  # fmt: skip
    if dados.justificativa is not None:
        plano.justificativa = dados.justificativa
    if dados.responsavel:
        plano.responsavel = dados.responsavel.strip()
    if dados.prazo:
        plano.prazo = dados.prazo
    plano.save()
    return plano


def registrar_medicao(*, loja, usuario, plano: PlanoAcao, dados) -> Medicao:
    m = Medicao.objects.create(
        loja=loja,
        plano=plano,
        periodo_antes_inicio=dados.periodo_antes_inicio,
        periodo_antes_fim=dados.periodo_antes_fim,
        periodo_depois_inicio=dados.periodo_depois_inicio,
        periodo_depois_fim=dados.periodo_depois_fim,
        valor_antes=dados.valor_antes,
        valor_depois=dados.valor_depois,
        contexto=dados.contexto or "",
    )
    registrar_evento(
        loja, usuario, "medicao_registrada", f"plano:{plano.pk}",
        antes=str(m.valor_antes), depois=str(m.valor_depois),
    )  # fmt: skip
    return m


# ── sugestão automática de medição ────────────────────────────────────────────
def _contar_demandas(loja, alvo: dict, ini: date, fim: date) -> int:
    qs = (
        DemandaNaoAtendida.objects.da_loja(loja)
        .filter(registrado_em__date__gte=ini, registrado_em__date__lte=fim)
        .select_related("variante__produto")
    )
    sku, rotulo = alvo.get("sku"), (alvo.get("rotulo") or "").lower()
    n = 0
    for d in qs:
        r, s = rotulo_demanda(d)
        if (sku and s == sku) or (not sku and r.lower() == rotulo):
            n += 1
    return n


def _unidades(loja, ini: date, fim: date, *, sku=None, categoria=None, dia=None, faixa=None) -> int:
    qs = ItemPedido.objects.da_loja(loja).filter(
        pedido__status=Pedido.Status.CONCLUIDA,
        pedido__data_hora__date__gte=ini,
        pedido__data_hora__date__lte=fim,
    )
    if sku:
        qs = qs.filter(variante__sku=sku)
    if categoria:
        qs = qs.filter(variante__produto__categoria=categoria)
    total = 0
    for i in qs.select_related("pedido"):
        local = timezone.localtime(i.pedido.data_hora)
        if dia is not None and (local.weekday() != dia or not faixa <= local.hour < faixa + 2):
            continue
        total += i.quantidade
    return total


def sugerir_medicao(loja, plano: PlanoAcao) -> dict | None:
    o = plano.oportunidade
    if o is None:
        return None
    alvo, regra = o.alvo or {}, o.regra
    dias = 7 if regra.startswith("A_") else 14
    base = timezone.localtime(plano.criado_em).date()
    hoje = timezone.localdate()
    antes = (base - timedelta(days=dias), base - timedelta(days=1))
    depois = (base, min(base + timedelta(days=dias - 1), hoje))

    if regra.startswith("A_"):

        def medir(p):
            return _contar_demandas(loja, alvo, *p)

        unidade = "registros de falta"
    elif regra.startswith("B_"):

        def medir(p):
            return _unidades(loja, *p, sku=alvo.get("sku"))

        unidade = "unidades vendidas"
    elif regra == "C_PADRAO_PUBLICO":

        def medir(p):
            return _unidades(
                loja,
                *p,
                categoria=alvo.get("categoria"),
                dia=alvo.get("dia"),
                faixa=alvo.get("faixa"),
            )

        unidade = "unidades no horário"
    else:
        return None

    return {
        "periodo_antes_inicio": antes[0],
        "periodo_antes_fim": antes[1],
        "periodo_depois_inicio": depois[0],
        "periodo_depois_fim": depois[1],
        "valor_antes": Decimal(medir(antes)),
        "valor_depois": Decimal(medir(depois)),
        "unidade": unidade,
        "periodo_depois_completo": depois[1] >= base + timedelta(days=dias - 1),
    }
