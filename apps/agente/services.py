"""Única porta de escrita do agente: confirmar() usa os MESMOS services/validações dos formulários."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.acoes.auditoria import registrar_evento
from apps.clientes import services as clientes_services
from apps.clientes.models import Cliente
from apps.core.faixas import normalizar_faixa
from apps.publico.api import DemandaIn
from apps.publico.services import registrar_demanda

from .models import Campanha, PropostaAgente
from .prospeccao import link_whatsapp


class PropostaErro(Exception):
    pass


def _pendente(p: PropostaAgente, *status):
    if p.status not in (status or (PropostaAgente.Status.PENDENTE,)):
        raise PropostaErro("Essa proposta já foi decidida.")


@transaction.atomic
def confirmar(
    *, loja, usuario, papel: str, proposta: PropostaAgente, ajustes: dict | None = None
) -> PropostaAgente:
    from apps.core.permissoes import HIERARQUIA

    _pendente(proposta)
    dados = proposta.dados | (ajustes or {})
    minimo = "atendente" if proposta.tipo == PropostaAgente.Tipo.DEMANDA else "gerente"
    if HIERARQUIA.get(papel, 0) < HIERARQUIA[minimo]:
        raise PropostaErro("Seu papel não permite confirmar essa proposta.")

    if proposta.tipo == PropostaAgente.Tipo.DEMANDA:
        entrada = DemandaIn(**{k: dados.get(k) for k in DemandaIn.model_fields if k in dados})
        if not entrada.produto_id and not (entrada.produto_texto or "").strip():
            raise PropostaErro("Diga o que o cliente procurou antes de confirmar.")
        d = registrar_demanda(loja=loja, usuario=usuario, dados=entrada)
        proposta.objeto_criado = f"demanda:{d.id}"

    elif proposta.tipo == PropostaAgente.Tipo.CLIENTE:
        try:
            zap = clientes_services.normalizar_whatsapp(dados.get("whatsapp"))
            faixa = normalizar_faixa(dados.get("faixa_etaria")) or ""
        except ValueError as exc:
            raise PropostaErro(str(exc)) from exc
        if not (dados.get("nome") or zap):
            raise PropostaErro("Informe ao menos nome ou WhatsApp.")
        c = Cliente.objects.da_loja(loja).filter(whatsapp=zap).first() if zap else None
        c = c or Cliente(loja=loja, ref=clientes_services.novo_ref(), origem=Cliente.Origem.AGENTE)
        c.nome = (dados.get("nome") or c.nome).strip()[:120]
        c.whatsapp = zap or c.whatsapp
        c.faixa_etaria = faixa or c.faixa_etaria
        c.tamanhos = dados.get("tamanhos") or c.tamanhos
        c.categorias_interesse = dados.get("categorias_interesse") or c.categorias_interesse
        if dados.get("consentimento_contato") and not c.consentimento_contato:
            c.consentimento_em = timezone.now()
        c.consentimento_contato = bool(dados.get("consentimento_contato"))
        c.save()
        proposta.objeto_criado = f"cliente:{c.id}"

    elif proposta.tipo == PropostaAgente.Tipo.CONTATO:
        if not proposta.cliente or not proposta.cliente.consentimento_contato:
            raise PropostaErro("Cliente sem consentimento de contato.")
        msg = (dados.get("mensagem") or "").strip()
        if "SAIR" not in msg.upper():
            msg += " (Responda SAIR para não receber mensagens.)"
        proposta.dados = proposta.dados | {
            "mensagem": msg[:700],
            "link": link_whatsapp(proposta.cliente.whatsapp, msg),
        }
        if proposta.campanha and proposta.campanha.status == Campanha.Status.PROPOSTA:
            proposta.campanha.status = Campanha.Status.ATIVA
            proposta.campanha.save(update_fields=["status"])

    if proposta.tipo != PropostaAgente.Tipo.CONTATO:
        proposta.dados = dados
    proposta.status = PropostaAgente.Status.CONFIRMADA
    proposta.decidido_por = usuario
    proposta.decidido_em = timezone.now()
    proposta.save()
    registrar_evento(
        loja, usuario, "proposta_confirmada", f"proposta:{proposta.pk}", tipo=proposta.tipo
    )
    return proposta


def rejeitar(*, loja, usuario, proposta: PropostaAgente) -> PropostaAgente:
    _pendente(proposta)
    proposta.status = PropostaAgente.Status.REJEITADA
    proposta.decidido_por = usuario
    proposta.decidido_em = timezone.now()
    proposta.save(update_fields=["status", "decidido_por", "decidido_em"])
    registrar_evento(
        loja, usuario, "proposta_rejeitada", f"proposta:{proposta.pk}", tipo=proposta.tipo
    )
    return proposta


@transaction.atomic
def marcar_enviada(*, loja, usuario, proposta: PropostaAgente) -> PropostaAgente:
    if (
        proposta.tipo != PropostaAgente.Tipo.CONTATO
        or proposta.status != PropostaAgente.Status.CONFIRMADA
    ):
        raise PropostaErro("Aprove a mensagem antes de marcar como enviada.")
    agora = timezone.now()
    proposta.status = PropostaAgente.Status.ENVIADA
    proposta.enviado_em = agora
    proposta.save(update_fields=["status", "enviado_em"])
    proposta.cliente.ultimo_contato_em = agora  # inicia o descanso de 14 dias
    proposta.cliente.save(update_fields=["ultimo_contato_em", "atualizado_em"])
    registrar_evento(
        loja,
        usuario,
        "contato_enviado",
        f"cliente:{proposta.cliente_id}",
        campanha=proposta.campanha_id,
    )
    return proposta
