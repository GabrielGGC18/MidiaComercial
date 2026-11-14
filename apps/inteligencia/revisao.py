"""Revisão dos dados de entrada e datas das fontes de uma loja.

A revisão é uma assinatura barata (agregados, sem ler as linhas) de tudo que muda o
resultado do motor: vendas, estoque, procuras, catálogo, configuração, decisões
(planos, descartes, adiamentos), a janela e se o estoque ainda está dentro do prazo.

- Mesma revisão + mesma versão do motor → a análise vigente continua valendo
  (recalcular devolve a mesma, sem criar outra).
- Revisão atual diferente da gravada na análise → a análise está desatualizada.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, timedelta

from django.db.models import Count, Max, Q
from django.utils import timezone

from apps.acoes.models import PlanoAcao
from apps.comercio.models import Pedido, Variante
from apps.estoque.models import SnapshotEstoque
from apps.publico.models import DemandaNaoAtendida
from apps.publico.services import configuracao

from .models import Oportunidade

# Sobe quando regras, priorização ou campos estruturados mudam o resultado para os
# mesmos dados (a análise antiga fica marcada como desatualizada).
VERSAO_MOTOR = "2"


def _janela(loja, fim: date | None) -> tuple[date, date, object]:
    cfg = configuracao(loja)
    fim = fim or timezone.localdate()
    return fim - timedelta(days=cfg.janela_dias - 1), fim, cfg


def fontes(loja) -> dict:
    """Quando cada fonte foi alimentada pela última vez (para a tela dizer o que atualizar)."""
    cfg = configuracao(loja)
    agora = timezone.now()
    capturado = SnapshotEstoque.objects.da_loja(loja).aggregate(m=Max("capturado_em"))["m"]
    horas = round((agora - capturado).total_seconds() / 3600, 1) if capturado else None
    ped = Pedido.objects.da_loja(loja).aggregate(m=Max("data_hora"), n=Count("id"))
    dem = DemandaNaoAtendida.objects.da_loja(loja).aggregate(m=Max("registrado_em"))["m"]
    return {
        "vendas": {"ultimo_pedido_em": ped["m"], "pedidos": ped["n"]},
        "estoque": {
            "capturado_em": capturado,
            "horas": horas,
            "limite_horas": cfg.b_max_horas_estoque,
            "recente": horas is not None and horas <= cfg.b_max_horas_estoque,
        },
        "demandas": {"ultimo_registro_em": dem},
    }


def revisao(loja, fim: date | None = None) -> str:
    inicio, fim, cfg = _janela(loja, fim)
    agora = timezone.now()
    ped = Pedido.objects.da_loja(loja).aggregate(
        n=Count("id"),
        m=Max("id"),
        concl=Count("id", filter=Q(status=Pedido.Status.CONCLUIDA)),
        itens=Count("itens"),
    )
    est = SnapshotEstoque.objects.da_loja(loja).aggregate(
        n=Count("id"), m=Max("id"), c=Max("capturado_em")
    )
    dem = DemandaNaoAtendida.objects.da_loja(loja).aggregate(n=Count("id"), m=Max("id"))
    var = Variante.objects.da_loja(loja).aggregate(n=Count("id"), m=Max("id"))
    planos = PlanoAcao.objects.da_loja(loja).aggregate(
        n=Count("id"), m=Max("id"), abertos=Count("id", filter=Q(situacao="aberta"))
    )
    ops = Oportunidade.objects.da_loja(loja).aggregate(
        desc=Count("id", filter=Q(descartada_em__isnull=False)),
        adiadas=Count("id", filter=Q(adiada_ate__gt=agora)),
    )
    estoque_recente = bool(
        est["c"] and (agora - est["c"]).total_seconds() / 3600 <= cfg.b_max_horas_estoque
    )
    assinatura = {
        "v": VERSAO_MOTOR,
        "janela": [inicio.isoformat(), fim.isoformat()],
        "cfg": [
            cfg.janela_dias, cfg.a_min_demandas, cfg.b_dias_sem_venda,
            cfg.b_max_horas_estoque, str(cfg.c_limiar_concentracao),
            str(cfg.c_min_cobertura_cliente),
        ],
        "pedidos": [ped["n"], ped["m"], ped["concl"], ped["itens"]],
        "estoque": [est["n"], est["m"], est["c"].isoformat() if est["c"] else None],
        "estoque_recente": estoque_recente,
        "demandas": [dem["n"], dem["m"]],
        "variantes": [var["n"], var["m"]],
        "planos": [planos["n"], planos["m"], planos["abertos"]],
        "decisoes": [ops["desc"], ops["adiadas"]],
    }  # fmt: skip
    bruto = json.dumps(assinatura, sort_keys=True, default=str).encode()
    return hashlib.sha256(bruto).hexdigest()[:32]
