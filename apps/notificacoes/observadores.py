"""Observers registrados no barramento. Para um canal novo, crie outra função com @observa."""

from __future__ import annotations

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from apps.core.permissoes import HIERARQUIA

from . import eventos as ev
from .models import Notificacao

log = logging.getLogger(__name__)
JANELA_AGRUPAMENTO = timedelta(hours=24)


def _brl(v) -> str:
    return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# tipo → (nível, papel mínimo, link, título(d), texto(d))
MODELOS = {
    ev.DEMANDA_LIMIAR: (
        "atencao", "gerente", "/demanda",
        lambda d: f"{d['n']} procuraram {d['rotulo']} e não tinha",
        lambda d: "Sem estoque desse item. Vale conferir a reposição." if d.get("saldo") == 0
        else "Item fora do catálogo. Avalie incluir no mix.",
    ),
    ev.OPORTUNIDADE_NOVA: (
        "info", "gerente", "/",
        lambda d: f"Nova oportunidade: {d['titulo']}",
        lambda d: f"{d['regra_nome']} · dados suficientes",
    ),
    ev.CAMPANHA_PROPOSTA: (
        "info", "gerente", "/agente",
        lambda d: f"{d['n']} clientes para {d['rotulo']}",
        lambda d: "O agente preparou as mensagens. Revise e aprove antes de enviar.",
    ),
    ev.CLIENTE_COMPROU: (
        "sucesso", "gerente", "/agente",
        lambda d: "Cliente comprou depois do contato",
        lambda d: f"Cliente {d['ref']} comprou {d['categoria']} {d['dias']} dia(s) após a mensagem.",
    ),
    ev.ACAO_ATRASADA: (
        "erro", "gerente", None,
        lambda d: f"Ação atrasada: {d['titulo']}",
        lambda d: f"Responsável: {d['responsavel']} · prazo {d['prazo']}",
    ),
    ev.IMPORTACAO_DIVERGENTE: (
        "atencao", "gerente", "/importar",
        lambda d: f"Importação com diferença de {d['percentual']}%",
        lambda d: f"Lote #{d['lote']}: importado {_brl(d['importado'])}, origem {_brl(d['origem'])}.",
    ),
    ev.ESTOQUE_DESATUALIZADO: (
        "atencao", "gerente", "/importar",
        lambda d: f"Estoque desatualizado há {d['horas']} h",
        lambda d: "A regra de estoque parado está bloqueada. Importe um saldo recente.",
    ),
}  # fmt: skip


@ev.observa(*ev.TIPOS)
def notificar_na_tela(evento: ev.Evento) -> Notificacao:
    nivel, papel, link, titulo, texto = MODELOS[evento.tipo]
    d = evento.dados
    link = link or d.get("link", "")
    recente = (
        Notificacao.objects.da_loja(evento.loja)
        .filter(chave=evento.chave, atualizada_em__gte=timezone.now() - JANELA_AGRUPAMENTO)
        .first()
    )
    if recente:  # mesmo assunto em 24 h: atualiza e volta a ficar não lida
        recente.contador += 1
        recente.titulo, recente.texto = titulo(d)[:140], texto(d)[:300]
        recente.save()
        recente.leituras.all().delete()
        return recente
    return Notificacao.objects.create(
        loja=evento.loja,
        tipo=evento.tipo,
        nivel=nivel,
        titulo=titulo(d)[:140],
        texto=texto(d)[:300],
        link=link,
        papel_minimo=papel,
        chave=evento.chave[:120],
    )


@ev.observa(ev.ACAO_ATRASADA, ev.IMPORTACAO_DIVERGENTE, ev.ESTOQUE_DESATUALIZADO, ev.DEMANDA_LIMIAR)
def avisar_por_email(evento: ev.Evento) -> int:
    """Opcional (NOTIFICACOES_EMAIL=True). Só para quem tem e-mail e papel suficiente."""
    if not settings.NOTIFICACOES_EMAIL:
        return 0
    _nivel, papel, _link, titulo, texto = MODELOS[evento.tipo]
    destinos = [
        v.user.email
        for v in evento.loja.vinculos.select_related("user")
        if v.user.email and HIERARQUIA.get(v.papel, 0) >= HIERARQUIA[papel]
    ]
    if not destinos:
        return 0
    return send_mail(
        f"[MidiaComercial · {evento.loja.nome}] {titulo(evento.dados)}",
        texto(evento.dados) + "\n\nAbra o MidiaComercial para ver os detalhes.",
        settings.DEFAULT_FROM_EMAIL,
        destinos,
        fail_silently=True,
    )
