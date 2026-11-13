"""Perfil de compra ("Meu público", P0-3) e demanda não atendida (P0-4).

Agregação em Python: volume de demo é pequeno e assim o fuso local (dia/hora) fica correto
em qualquer banco. Todas as queries passam por .da_loja(loja).
"""

from __future__ import annotations

import unicodedata
from collections import Counter, defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from apps.comercio.models import Devolucao, ItemPedido, Pedido, Produto, Variante
from apps.contas.models import ConfiguracaoLoja
from apps.core.faixas import FAIXAS_ORDEM, FaixaEtaria
from apps.estoque.models import SnapshotEstoque

from .models import DemandaNaoAtendida

DOIS = Decimal("0.01")


def configuracao(loja) -> ConfiguracaoLoja:
    cfg, _ = ConfiguracaoLoja.objects.get_or_create(loja=loja)
    return cfg


def janela_padrao(loja, inicio: date | None, fim: date | None) -> tuple[date, date]:
    fim = fim or timezone.localdate()
    inicio = inicio or fim - timedelta(days=configuracao(loja).janela_dias - 1)
    if inicio > fim:
        inicio, fim = fim, inicio
    return inicio, fim


def _pct(parte, total) -> Decimal:
    if not total:
        return Decimal("0")
    return (Decimal(parte) / Decimal(total) * 100).quantize(Decimal("0.1"))


def perfil_publico(loja, inicio: date, fim: date) -> dict:
    cfg = configuracao(loja)
    pedidos = list(
        Pedido.objects.da_loja(loja)
        .filter(data_hora__date__gte=inicio, data_hora__date__lte=fim, status="concluida")
        .only("id", "data_hora", "cliente_ref", "faixa_etaria")
    )
    ids = [p.id for p in pedidos]
    itens = list(
        ItemPedido.objects.da_loja(loja)
        .filter(pedido_id__in=ids)
        .select_related("variante__produto")
        .only("pedido_id", "quantidade", "receita_item", "variante__produto__categoria")
    )
    devolvido = sum(
        (
            d.valor
            for d in Devolucao.objects.da_loja(loja).filter(
                data__date__gte=inicio, data__date__lte=fim
            )
        ),
        Decimal("0"),
    )
    receita_bruta = sum((i.receita_item for i in itens), Decimal("0"))
    receita = receita_bruta - devolvido
    n_pedidos = len(pedidos)

    # categorias (receita / unidades / pedidos)
    cat_receita, cat_unid, cat_ped = defaultdict(Decimal), Counter(), defaultdict(set)
    for i in itens:
        c = i.variante.produto.categoria
        cat_receita[c] += i.receita_item
        cat_unid[c] += i.quantidade
        cat_ped[c].add(i.pedido_id)
    categorias = sorted(
        (
            {
                "categoria": c,
                "receita": cat_receita[c].quantize(DOIS),
                "unidades": cat_unid[c],
                "pedidos": len(cat_ped[c]),
                "participacao_receita": _pct(cat_receita[c], receita_bruta),
            }
            for c in cat_receita
        ),
        key=lambda x: x["receita"],
        reverse=True,
    )

    # quando compram: dia da semana (0=seg) × hora local
    heat = Counter()
    por_dia = defaultdict(Decimal)
    receita_por_pedido = defaultdict(Decimal)
    for i in itens:
        receita_por_pedido[i.pedido_id] += i.receita_item
    for p in pedidos:
        local = timezone.localtime(p.data_hora)
        heat[(local.weekday(), local.hour)] += 1
        por_dia[local.date()] += receita_por_pedido[p.id]
    heatmap = [{"dia": d, "hora": h, "pedidos": n} for (d, h), n in sorted(heat.items())]
    serie = []
    dia = inicio
    while dia <= fim:
        serie.append({"data": dia, "receita": por_dia.get(dia, Decimal("0")).quantize(DOIS)})
        dia += timedelta(days=1)

    # cobertura e recorrência (só clientes identificados)
    identificados = [p for p in pedidos if p.cliente_ref]
    cobertura = (Decimal(len(identificados)) / n_pedidos) if n_pedidos else Decimal("0")
    recorrencia = {
        "status": "bloqueada",
        "motivo": None,
        "clientes_identificados": 0,
        "compra_unica_pct": None,
        "recorrentes_pct": None,
    }
    if cobertura < cfg.c_min_cobertura_cliente:
        recorrencia["motivo"] = (
            f"Só {_pct(len(identificados), n_pedidos)}% dos pedidos têm cliente identificado; "
            f"o mínimo para ler recorrência é {int(cfg.c_min_cobertura_cliente * 100)}%."
        )
    else:
        por_cliente = Counter(p.cliente_ref for p in identificados)
        n_cli = len(por_cliente)
        recorrentes = sum(1 for n in por_cliente.values() if n >= 2)
        recorrencia |= {
            "status": "suficiente" if n_cli >= 30 else "amostra_limitada",
            "clientes_identificados": n_cli,
            "compra_unica_pct": _pct(n_cli - recorrentes, n_cli),
            "recorrentes_pct": _pct(recorrentes, n_cli),
        }

    return {
        "inicio": inicio,
        "fim": fim,
        "kpis": {
            "receita": receita.quantize(DOIS),
            "devolucoes": devolvido.quantize(DOIS),
            "pedidos": n_pedidos,
            "ticket_medio": (receita / n_pedidos).quantize(DOIS) if n_pedidos else Decimal("0"),
            "itens": sum(i.quantidade for i in itens),
        },
        "cobertura": {
            "percentual": _pct(len(identificados), n_pedidos),
            "identificados": len(identificados),
            "total": n_pedidos,
        },
        "categorias": categorias,
        "heatmap": heatmap,
        "serie_diaria": serie,
        "recorrencia": recorrencia,
        "periodos": periodos_por_nicho(pedidos, itens),
        "faixas": perfil_faixas(loja, pedidos, itens, inicio, fim),
    }


# ── período e horário por nicho (categoria) ──────────────────────────────────
LIMITACAO_PERIODO = (
    "Associação observada, não causa: o horário pode refletir só o movimento da loja."
)
LIMITACAO_FAIXA = (
    "Faixa estimada pelo atendente ou informada no cadastro; vale só para os pedidos com faixa."
)
DIAS_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
FASES_MES = [("1–10", 1, 10), ("11–20", 11, 20), ("21–31", 21, 31)]


def _faixa_hora(h: int) -> int:
    return (h // 2) * 2


def periodos_por_nicho(pedidos, itens) -> dict:
    """Quando cada nicho vende: top dia × faixa de 2 h, turno e fase do mês (efeito salário)."""
    local = {p.id: timezone.localtime(p.data_hora) for p in pedidos}
    slot_rec, slot_ped = defaultdict(Decimal), defaultdict(set)
    cat_slot = defaultdict(Counter)
    cat_total = Counter()
    turno = defaultdict(Decimal)
    fase = defaultdict(lambda: {"receita": Decimal("0"), "pedidos": set()})
    for i in itens:
        t = local.get(i.pedido_id)
        if t is None:
            continue
        chave = (t.weekday(), _faixa_hora(t.hour))
        slot_rec[chave] += i.receita_item
        slot_ped[chave].add(i.pedido_id)
        cat = i.variante.produto.categoria
        cat_slot[cat][chave] += i.quantidade
        cat_total[cat] += i.quantidade
        turno["manha" if t.hour < 12 else "tarde"] += i.receita_item
        nome_fase = next(n for n, a, b in FASES_MES if a <= t.day <= b)
        fase[nome_fase]["receita"] += i.receita_item
        fase[nome_fase]["pedidos"].add(i.pedido_id)

    def rot(dia, fx):
        return f"{DIAS_PT[dia]} {fx}–{fx + 2}h"

    top = sorted(slot_rec.items(), key=lambda kv: kv[1], reverse=True)[:3]
    total_rec = sum(slot_rec.values(), Decimal("0")) or Decimal("1")
    por_cat = []
    for cat, total in cat_total.most_common():
        (dia, fx), qtd = cat_slot[cat].most_common(1)[0]
        por_cat.append(
            {
                "categoria": cat,
                "melhor_periodo": rot(dia, fx),
                "dia": dia,
                "faixa": fx,
                "participacao": _pct(qtd, total),
                "unidades": total,
                "amostra_limitada": total < 20,
            }
        )
    tot_turno = sum(turno.values(), Decimal("0")) or Decimal("1")
    return {
        "top": [
            {
                "periodo": rot(d, fx),
                "dia": d,
                "faixa": fx,
                "receita": v.quantize(DOIS),
                "pedidos": len(slot_ped[(d, fx)]),
                "participacao": _pct(v, total_rec),
            }
            for (d, fx), v in top
        ],
        "por_categoria": por_cat,
        "turnos": [
            {"turno": "Manhã (até 12h)", "participacao": _pct(turno["manha"], tot_turno)},
            {"turno": "Tarde (12h em diante)", "participacao": _pct(turno["tarde"], tot_turno)},
        ],
        "fases_mes": [
            {
                "fase": n,
                "receita": fase[n]["receita"].quantize(DOIS),
                "pedidos": len(fase[n]["pedidos"]),
                "participacao": _pct(fase[n]["receita"], total_rec),
            }
            for n, _a, _b in FASES_MES
        ],
        "limitacao": LIMITACAO_PERIODO,
    }


# ── faixa etária (estimada) ───────────────────────────────────────────────────
def perfil_faixas(loja, pedidos, itens, inicio: date, fim: date) -> dict:
    faixa_do_pedido = {p.id: p.faixa_etaria for p in pedidos if p.faixa_etaria}
    receita, ped, cats = defaultdict(Decimal), defaultdict(set), defaultdict(Counter)
    for i in itens:
        f = faixa_do_pedido.get(i.pedido_id)
        if not f:
            continue
        receita[f] += i.receita_item
        ped[f].add(i.pedido_id)
        cats[f][i.variante.produto.categoria] += i.quantidade
    procuras = Counter(
        DemandaNaoAtendida.objects.da_loja(loja)
        .filter(registrado_em__date__gte=inicio, registrado_em__date__lte=fim)
        .exclude(faixa_etaria="")
        .values_list("faixa_etaria", flat=True)
    )
    total_ped = len(pedidos)
    com_faixa = len(faixa_do_pedido)
    tot_rec = sum(receita.values(), Decimal("0")) or Decimal("1")
    linhas = []
    for f in FAIXAS_ORDEM:
        n = len(ped[f])
        linhas.append(
            {
                "faixa": f,
                "rotulo": FaixaEtaria(f).label,
                "pedidos": n,
                "receita": receita[f].quantize(DOIS),
                "participacao": _pct(receita[f], tot_rec),
                "ticket_medio": (receita[f] / n).quantize(DOIS) if n else Decimal("0"),
                "categoria_preferida": cats[f].most_common(1)[0][0] if cats[f] else None,
                "procuras_nao_atendidas": procuras.get(f, 0),
            }
        )
    principal = max(linhas, key=lambda x: x["receita"]) if com_faixa else None
    if com_faixa < 20:
        status = "bloqueada"
    elif com_faixa >= 60:
        status = "suficiente"
    else:
        status = "amostra_limitada"
    return {
        "faixas": linhas,
        "cobertura": {
            "percentual": _pct(com_faixa, total_ped),
            "com_faixa": com_faixa,
            "total": total_ped,
        },
        "principal": principal["rotulo"] if principal else None,
        "status": status,
        "limitacao": LIMITACAO_FAIXA,
    }


# ── demanda não atendida ──────────────────────────────────────────────────────
def _sem_acento(txt: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", txt.lower()) if not unicodedata.combining(c)
    )


def buscar_catalogo(loja, q: str, limite: int = 8) -> list[dict]:
    """Busca do balcão: "calca 42" acha "Calça jeans" tam. 42 (sem acento, todos os termos)."""
    termos = _sem_acento(q).split()
    candidatos = []
    for p in Produto.objects.da_loja(loja).prefetch_related("variantes"):
        vs = list(p.variantes.all())
        nome = _sem_acento(p.nome)
        texto = " ".join(
            [nome, _sem_acento(p.categoria)]
            + [_sem_acento(f"{v.cor} {v.tamanho} {v.sku}") for v in vs]
        )
        if all(t in texto for t in termos):
            candidatos.append((-sum(t in nome for t in termos), p.categoria, p.nome, p))
    ordenados = [c[-1] for c in sorted(candidatos, key=lambda c: c[:3])]
    out = []
    for p in ordenados[:limite]:
        vs = sorted(p.variantes.all(), key=lambda v: v.sku)
        out.append(
            {
                "id": p.id,
                "nome": p.nome,
                "categoria": p.categoria,
                "tamanhos": list(dict.fromkeys(v.tamanho for v in vs if v.tamanho)),
                "cores": list(dict.fromkeys(v.cor for v in vs if v.cor)),
                "variantes": [{"sku": v.sku, "tamanho": v.tamanho, "cor": v.cor} for v in vs],
            }
        )
    return out


def registrar_demanda(*, loja, usuario, dados) -> DemandaNaoAtendida:
    """Resolve a variante pelo produto+tamanho+cor. Se a combinação não existe no catálogo,
    grava como texto (é justamente a 'variação ausente')."""
    variante = None
    produto = None
    if dados.produto_id:
        produto = Produto.objects.da_loja(loja).filter(pk=dados.produto_id).first()
        if produto is None:
            raise Produto.DoesNotExist
        variante = (
            Variante.objects.da_loja(loja)
            .filter(produto=produto, tamanho=dados.tamanho or "", cor=dados.cor or "")
            .first()
        )
        if (
            variante is None
            and len(produto.variantes.all()) == 1
            and not (dados.tamanho or dados.cor)
        ):
            variante = produto.variantes.first()
    d = DemandaNaoAtendida.objects.create(
        loja=loja,
        variante=variante,
        produto_texto="" if variante else (produto.nome if produto else dados.produto_texto or ""),
        categoria=produto.categoria if produto else (dados.categoria or ""),
        tamanho=dados.tamanho or "",
        cor=dados.cor or "",
        motivo=dados.motivo,
        qtd_procurada=dados.qtd_procurada,
        faixa_etaria=getattr(dados, "faixa_etaria", None) or "",
        registrado_por=usuario,
        registrado_em=timezone.now(),
    )
    _avisar_limiar(loja, d)
    return d


def _avisar_limiar(loja, d: DemandaNaoAtendida) -> None:
    """Publica DEMANDA_LIMIAR quando o item chega a N procuras sem estoque na janela."""
    from apps.notificacoes.eventos import DEMANDA_LIMIAR, publicar

    cfg = configuracao(loja)
    qs = DemandaNaoAtendida.objects.da_loja(loja).filter(
        registrado_em__gte=timezone.now() - timedelta(days=cfg.janela_dias)
    )
    saldo = None
    if d.variante_id:
        saldo = saldos_atuais(loja).get(d.variante_id, (None,))[0]
        if saldo:  # tem estoque: não é falta
            return
        qs = qs.filter(variante_id=d.variante_id)
    else:
        qs = qs.filter(
            variante__isnull=True,
            produto_texto__iexact=d.produto_texto,
            tamanho=d.tamanho,
            cor=d.cor,
        )
    n = qs.count()
    if n >= cfg.a_min_demandas:
        rotulo, sku = rotulo_demanda(d)
        publicar(
            DEMANDA_LIMIAR,
            loja,
            chave=f"demanda:{sku or rotulo.lower()}",
            n=n,
            rotulo=rotulo,
            saldo=saldo,
        )


def rotulo_demanda(d: DemandaNaoAtendida) -> tuple[str, str | None]:
    """(rótulo legível, sku ou None)."""
    if d.variante_id:
        v = d.variante
        return f"{v.produto.nome} {v.cor} {v.tamanho}".strip(), v.sku
    partes = [d.produto_texto or d.categoria or "Item sem nome", d.cor, d.tamanho]
    return " ".join(p for p in partes if p), None


def saldos_atuais(loja) -> dict[int, tuple[int, object]]:
    """variante_id → (saldo, capturado_em) do snapshot mais recente."""
    out = {}
    for s in SnapshotEstoque.objects.da_loja(loja).order_by("variante_id", "-capturado_em"):
        out.setdefault(s.variante_id, (s.saldo, s.capturado_em))
    return out


def ranking_demanda(loja, inicio: date, fim: date, motivo: str | None = None) -> dict:
    qs = (
        DemandaNaoAtendida.objects.da_loja(loja)
        .filter(registrado_em__date__gte=inicio, registrado_em__date__lte=fim)
        .select_related("variante__produto")
    )
    if motivo:
        qs = qs.filter(motivo=motivo)
    grupos: dict[str, dict] = {}
    por_motivo_total = Counter()
    saldos = saldos_atuais(loja)
    for d in qs:
        rotulo, sku = rotulo_demanda(d)
        chave = sku or rotulo.lower()
        g = grupos.setdefault(
            chave,
            {
                "chave": chave,
                "rotulo": rotulo,
                "sku": sku,
                "categoria": d.variante.produto.categoria if d.variante_id else d.categoria,
                "total": 0,
                "por_motivo": Counter(),
                "saldo": saldos.get(d.variante_id, (None,))[0] if d.variante_id else None,
                "no_catalogo": bool(d.variante_id),
            },
        )
        g["total"] += 1
        g["por_motivo"][d.motivo] += 1
        por_motivo_total[d.motivo] += 1
    itens = sorted(grupos.values(), key=lambda g: g["total"], reverse=True)
    for g in itens:
        g["por_motivo"] = dict(g["por_motivo"])
    return {
        "inicio": inicio,
        "fim": fim,
        "total": sum(g["total"] for g in itens),
        "por_motivo": dict(por_motivo_total),
        "itens": itens[:50],
    }


def ultimas_demandas(loja, usuario=None, limite: int = 5) -> list[DemandaNaoAtendida]:
    qs = DemandaNaoAtendida.objects.da_loja(loja).select_related("variante__produto")
    if usuario is not None:
        qs = qs.filter(registrado_por=usuario)
    return list(qs.order_by("-registrado_em")[:limite])
