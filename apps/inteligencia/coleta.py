"""Monta o ContextoAnalise a partir do banco. Única parte do motor que faz query (.da_loja)."""

from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Max, Min
from django.utils import timezone

from apps.comercio.models import ItemPedido, Pedido, Variante
from apps.publico.models import DemandaNaoAtendida
from apps.publico.services import configuracao, rotulo_demanda, saldos_atuais

from .contexto import (
    ContextoAnalise,
    InfoSku,
    Limiares,
    RegistroDemanda,
    SaldoEstoque,
    VendaItem,
)


def montar_contexto(loja, fim: date | None = None) -> ContextoAnalise:
    cfg = configuracao(loja)
    fim = fim or timezone.localdate()
    inicio = fim - timedelta(days=cfg.janela_dias - 1)

    variantes = {v.id: v for v in Variante.objects.da_loja(loja).select_related("produto")}
    catalogo = {
        v.sku: InfoSku(
            nome=f"{v.produto.nome} {v.cor} {v.tamanho}".replace("  ", " ").strip(),
            categoria=v.produto.categoria,
            produto=str(v.produto_id),
        )
        for v in variantes.values()
    }

    itens = (
        ItemPedido.objects.da_loja(loja)
        .filter(
            pedido__status=Pedido.Status.CONCLUIDA,
            pedido__data_hora__date__gte=inicio,
            pedido__data_hora__date__lte=fim,
        )
        .select_related("pedido")
    )
    vendas = tuple(
        VendaItem(
            pedido_id=i.pedido_id,
            data_hora=timezone.localtime(i.pedido.data_hora),
            sku=variantes[i.variante_id].sku,
            categoria=variantes[i.variante_id].produto.categoria,
            quantidade=i.quantidade,
            receita=i.receita_item,
            cliente_ref=i.pedido.cliente_ref,
        )
        for i in itens
    )

    demandas = tuple(
        RegistroDemanda(
            registrado_em=timezone.localtime(d.registrado_em),
            sku=rotulo_demanda(d)[1],
            rotulo=rotulo_demanda(d)[0],
            categoria=d.variante.produto.categoria if d.variante_id else d.categoria,
            tamanho=d.tamanho,
            cor=d.cor,
            motivo=d.motivo,
        )
        for d in DemandaNaoAtendida.objects.da_loja(loja)
        .filter(registrado_em__date__gte=inicio, registrado_em__date__lte=fim)
        .select_related("variante__produto")
    )

    estoque = tuple(
        SaldoEstoque(sku=variantes[vid].sku, saldo=saldo, capturado_em=quando)
        for vid, (saldo, quando) in saldos_atuais(loja).items()
        if vid in variantes
    )

    ultima = (
        ItemPedido.objects.da_loja(loja)
        .filter(pedido__status=Pedido.Status.CONCLUIDA)
        .values("variante_id")
        .annotate(ultima=Max("pedido__data_hora"))
    )
    ultima_venda = {
        variantes[r["variante_id"]].sku: r["ultima"]
        for r in ultima
        if r["variante_id"] in variantes
    }
    inicio_hist = Pedido.objects.da_loja(loja).aggregate(m=Min("data_hora"))["m"]

    return ContextoAnalise(
        loja_id=loja.id,
        janela_inicio=inicio,
        janela_fim=fim,
        agora=timezone.now(),
        limiares=Limiares(
            a_min_demandas=cfg.a_min_demandas,
            b_dias_sem_venda=cfg.b_dias_sem_venda,
            b_max_horas_estoque=cfg.b_max_horas_estoque,
            c_limiar_concentracao=cfg.c_limiar_concentracao,
            c_min_cobertura_cliente=cfg.c_min_cobertura_cliente,
        ),
        vendas=vendas,
        demandas=demandas,
        estoque=estoque,
        catalogo=catalogo,
        ultima_venda=ultima_venda,
        inicio_historico=inicio_hist,
    )
