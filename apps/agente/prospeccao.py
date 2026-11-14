"""Agente de vendas: produtos em baixa → clientes com consentimento → propostas de contato.

Sinais → alvos → busca de clientes → motivos legíveis → proposta (mensagem) → pessoa aprova
→ link wa.me (envio humano) → medição (comprou a categoria em até 14 dias).
"""

from __future__ import annotations

from collections import Counter
from datetime import timedelta
from urllib.parse import quote

from django.db import transaction
from django.utils import timezone

from apps.clientes.models import Cliente
from apps.clientes.services import DESCANSO_DIAS, historico
from apps.comercio.models import ItemPedido, Pedido
from apps.inteligencia.coleta import montar_contexto
from apps.inteligencia.regras.b_pouca_saida import RegraPoucaSaida

from .models import Campanha, PropostaAgente

MAX_ALVOS = 3
MAX_CONTATOS_POR_ALVO = 15
QUEDA_MINIMA = 0.30
JANELA_QUEDA = 14
PONTUACAO_MINIMA = 3


# ── 1. sinais → alvos ─────────────────────────────────────────────────────────
def alvos_em_baixa(loja) -> list[dict]:
    ctx = montar_contexto(loja)
    alvos = []
    r = RegraPoucaSaida().avaliar(ctx)
    for op in r.oportunidades:
        sku = op.alvo["sku"]
        info = ctx.catalogo.get(sku)
        v = next((x for x in ctx.estoque if x.sku == sku), None)
        alvos.append(
            {
                "gatilho": "estoque_parado",
                "sku": sku,
                "rotulo": op.alvo.get("rotulo", sku),
                "categoria": info.categoria if info else "",
                "tamanho": ""
                if sku.endswith("-U")
                else (sku.rsplit("-", 1)[-1] if "-" in sku else ""),
                "saldo": v.saldo if v else None,
                "motivo": op.titulo,
            }
        )
    # queda de vendas por categoria (últimos 14 dias × 14 anteriores)
    hoje = timezone.localdate()
    base = ItemPedido.objects.da_loja(loja).filter(pedido__status=Pedido.Status.CONCLUIDA)

    def unidades(ini, fim):
        c = Counter()
        for cat, q in base.filter(
            pedido__data_hora__date__gte=ini, pedido__data_hora__date__lte=fim
        ).values_list("variante__produto__categoria", "quantidade"):
            c[cat] += q
        return c

    atual = unidades(hoje - timedelta(days=JANELA_QUEDA - 1), hoje)
    anterior = unidades(
        hoje - timedelta(days=2 * JANELA_QUEDA - 1), hoje - timedelta(days=JANELA_QUEDA)
    )
    cats_com_alvo = {a["categoria"] for a in alvos}
    for cat, antes in anterior.most_common():
        agora = atual.get(cat, 0)
        if antes >= 10 and (antes - agora) / antes >= QUEDA_MINIMA and cat not in cats_com_alvo:
            alvos.append(
                {
                    "gatilho": "queda_vendas",
                    "sku": None,
                    "rotulo": cat,
                    "categoria": cat,
                    "tamanho": "",
                    "saldo": None,
                    "motivo": f"{cat}: {agora} unidades nos últimos 14 dias contra {antes} antes "
                    f"(queda de {round((antes - agora) / antes * 100)}%)",
                }
            )
    return alvos[:MAX_ALVOS]


# ── 2. alvo → clientes com motivos legíveis ──────────────────────────────────
def _faixa_que_mais_compra(loja, categoria: str) -> str | None:
    c = Counter(
        ItemPedido.objects.da_loja(loja)
        .filter(variante__produto__categoria=categoria, pedido__status="concluida")
        .exclude(pedido__faixa_etaria="")
        .values_list("pedido__faixa_etaria", flat=True)
    )
    return c.most_common(1)[0][0] if c else None


def candidatos(
    loja, alvo: dict, tamanhos_em_estoque: set[str]
) -> list[tuple[Cliente, int, list[str], bool]]:
    """(cliente, pontos, motivos, tamanho_confirmado). tamanho_confirmado só é True quando o
    cadastro do cliente traz o tamanho do alvo; sem isso a mensagem não cita tamanho (PV-01)."""
    agora = timezone.now()
    descanso = agora - timedelta(days=DESCANSO_DIAS)
    base = [
        c
        for c in Cliente.objects.da_loja(loja)
        .filter(consentimento_contato=True)
        .exclude(whatsapp="")
        if not (c.ultimo_contato_em and c.ultimo_contato_em > descanso)
    ]
    hist = historico(loja, [c.ref for c in base])
    faixa_top = _faixa_que_mais_compra(loja, alvo["categoria"]) if alvo["categoria"] else None
    cat = alvo["categoria"].lower()
    out = []
    for c in base:
        h = hist.get(c.ref)
        pontos, motivos = 0, []
        comprou = h["categorias"].get(alvo["categoria"], 0) if h else 0
        if comprou:
            pontos += 3
            motivos.append(f"Já comprou {alvo['categoria']} ({comprou} un.)")
        if any(x.lower() == cat for x in c.categorias_interesse):
            pontos += 2
            motivos.append(f"Interesse declarado em {alvo['categoria']}")
        if not (comprou or any(x.lower() == cat for x in c.categorias_interesse)):
            continue  # sem relação com o nicho: não incomoda o cliente
        tams = {t.upper() for t in c.tamanhos}
        confirmado = bool(alvo["tamanho"]) and alvo["tamanho"].upper() in tams
        if confirmado:
            pontos += 3
            motivos.append(f"Veste {alvo['tamanho']} (tem em estoque)")
        elif alvo["tamanho"] and tams:
            continue  # tamanho do cliente conhecido e diferente: não serve
        elif not alvo["tamanho"] and tams & tamanhos_em_estoque:
            pontos += 2
            motivos.append(
                f"Veste {', '.join(sorted(tams & tamanhos_em_estoque))} (tem em estoque)"
            )
        if faixa_top and c.faixa_etaria == faixa_top:
            pontos += 1
            motivos.append(
                f"Faixa {c.get_faixa_etaria_display()}: a que mais compra {alvo['categoria']}"
            )
        if h and h["ultima_compra"] and h["ultima_compra"] > agora - timedelta(days=120):
            pontos += 1
            dias = (agora - h["ultima_compra"]).days
            motivos.append(f"Cliente ativo (última compra há {dias} dias)")
        if pontos >= PONTUACAO_MINIMA:
            out.append((c, pontos, motivos, confirmado))
    out.sort(key=lambda x: x[1], reverse=True)
    return out[:MAX_CONTATOS_POR_ALVO]


# ── 3. mensagem e link ────────────────────────────────────────────────────────
def mensagem(loja, cliente: Cliente, alvo: dict, tamanho_confirmado: bool = False) -> str:
    """Só afirma o que foi verificado (PV-01): nada de "separamos" (ninguém separou) nem
    "seu tamanho" sem o tamanho no cadastro do cliente. A reserva é uma pergunta."""
    nome = cliente.primeiro_nome or "tudo bem"
    if alvo["sku"]:
        oferta = f"temos {alvo['rotulo']}"
        if tamanho_confirmado and alvo["tamanho"] not in ("", "U"):
            oferta += f" no tamanho {alvo['tamanho']}, que você costuma usar"
    else:
        oferta = (
            f"chegaram novidades em {alvo['categoria']} que combinam com o que você costuma levar"
        )
    return (
        f"Oi, {nome}! Aqui é da {loja.nome}. Lembramos de você: {oferta}. "
        "Quer que a gente confira a disponibilidade e guarde uma peça para você provar? "
        "(Responda SAIR para não receber mensagens.)"
    )


def link_whatsapp(whatsapp: str, texto: str) -> str:
    return f"https://wa.me/{whatsapp}?text={quote(texto)}"


# ── 4. rodar: cria campanhas propostas (nada é enviado) ──────────────────────
@transaction.atomic
def rodar(ctx, termo: str | None = None) -> list[Campanha]:
    loja = ctx.loja
    from apps.publico.services import saldos_atuais

    saldos = saldos_atuais(loja)
    from apps.comercio.models import Variante

    variantes = {v.id: v for v in Variante.objects.da_loja(loja).select_related("produto")}
    campanhas = []
    pendentes = set(
        PropostaAgente.objects.da_loja(loja)
        .filter(tipo="contato", status="pendente")
        .values_list("cliente_id", "campanha__alvo__rotulo")
    )
    alvos = alvos_em_baixa(loja)
    if termo:
        from .provedores.offline import sem_acento

        ts = [sem_acento(t).rstrip("s") for t in termo.split()]
        filtrados = [
            a for a in alvos if any(t in sem_acento(a["rotulo"] + " " + a["categoria"]) for t in ts)
        ]
        alvos = filtrados or alvos
    for alvo in alvos:
        tam_estoque = {
            variantes[vid].tamanho.upper()
            for vid, (saldo, _q) in saldos.items()
            if saldo > 0
            and vid in variantes
            and variantes[vid].produto.categoria == alvo["categoria"]
        }
        achados = [
            x
            for x in candidatos(loja, alvo, tam_estoque)
            if (x[0].id, alvo["rotulo"]) not in pendentes
        ]
        if not achados:
            continue
        camp = Campanha.objects.create(
            loja=loja,
            titulo=f"Oferecer {alvo['rotulo']}",
            gatilho=alvo["gatilho"],
            alvo=alvo | {"tamanhos_com_estoque": sorted(tam_estoque)},
            motivo=alvo["motivo"],
            criado_por=ctx.usuario,
        )
        for cliente, pontos, motivos, confirmado in achados:
            incertos = [] if confirmado or alvo["tamanho"] in ("", "U") else ["tamanho"]
            p = PropostaAgente.objects.create(
                loja=loja,
                sessao=ctx.sessao,
                campanha=camp,
                cliente=cliente,
                tipo=PropostaAgente.Tipo.CONTATO,
                resumo=f"Contatar {cliente.nome or cliente.ref} sobre {alvo['rotulo']}",
                dados={"mensagem": mensagem(loja, cliente, alvo, confirmado)},
                campos_incertos=incertos,
                motivos=motivos,
                limitacao="Interesse provável, não garantido. Envie só se fizer sentido para o cliente.",
                pontuacao=pontos,
                criado_por=ctx.usuario,
            )
            ctx.propostas.append(p)
        campanhas.append(camp)
        from apps.notificacoes.eventos import CAMPANHA_PROPOSTA, publicar

        publicar(
            CAMPANHA_PROPOSTA,
            loja,
            chave=f"camp:{alvo['rotulo']}",
            n=len(achados),
            rotulo=alvo["rotulo"],
        )
    return campanhas


# ── 5. medição ────────────────────────────────────────────────────────────────
def medir(campanha: Campanha) -> dict:
    enviados = list(campanha.propostas.filter(status="enviada").select_related("cliente"))
    convertidos = 0
    cat = campanha.alvo.get("categoria")
    for p in enviados:
        if not p.cliente or not p.enviado_em:
            continue
        comprou = ItemPedido.objects.da_loja(campanha.loja).filter(
            pedido__cliente_ref=p.cliente.ref,
            pedido__status="concluida",
            pedido__data_hora__gte=p.enviado_em,
            pedido__data_hora__lte=p.enviado_em + timedelta(days=14),
            variante__produto__categoria=cat,
        )
        if comprou.exists():
            convertidos += 1
    total = campanha.propostas.count()
    return {
        "propostas": total,
        "aprovadas": campanha.propostas.filter(status__in=["confirmada", "enviada"]).count(),
        "enviadas": len(enviados),
        "convertidos": convertidos,
        "limitacao": "Compra após o contato mostra associação, não prova que a mensagem causou a venda.",
    }


def verificar_conversoes(loja, refs: set[str]) -> int:
    """Pedidos novos de clientes contatados: publica CLIENTE_COMPROU (uma vez por contato)."""
    from apps.notificacoes.eventos import CLIENTE_COMPROU, publicar

    if not refs:
        return 0
    limite = timezone.now() - timedelta(days=14)
    n = 0
    for p in (
        PropostaAgente.objects.da_loja(loja)
        .filter(status="enviada", enviado_em__gte=limite, cliente__ref__in=refs)
        .select_related("cliente", "campanha")
    ):
        cat = p.campanha.alvo.get("categoria") if p.campanha else None
        compra = (
            ItemPedido.objects.da_loja(loja)
            .filter(
                pedido__cliente_ref=p.cliente.ref, pedido__status="concluida",
                pedido__data_hora__gte=p.enviado_em, variante__produto__categoria=cat,
            )
            .order_by("pedido__data_hora")
            .select_related("pedido")
            .first()
        )  # fmt: skip
        if compra:
            dias = max(0, (compra.pedido.data_hora - p.enviado_em).days)
            publicar(
                CLIENTE_COMPROU,
                loja,
                chave=f"conv:{p.id}",
                ref=p.cliente.ref,
                categoria=cat,
                dias=dias,
            )
            n += 1
    return n
