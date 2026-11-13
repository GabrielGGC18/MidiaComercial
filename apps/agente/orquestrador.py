"""Orquestrador: loja da sessão, ferramentas por papel, mascaramento, auditoria e fallback offline."""

from __future__ import annotations

import logging
import time

from django.conf import settings

from .ferramentas import Contexto, obter
from .models import ChamadaFerramenta, SessaoAgente
from .privacidade import mascarar, restaurar
from .provedores.offline import ProvedorOffline

log = logging.getLogger(__name__)


def escolher_provedor():
    if settings.MIDIA_IA_HABILITADA and settings.MIDIA_IA_PROVEDOR == "claude":
        try:
            from .provedores.claude import ProvedorClaude

            return ProvedorClaude()
        except Exception as exc:  # noqa: BLE001
            log.warning("Provedor Claude indisponível (%s); usando offline.", exc)
    return ProvedorOffline()


def processar(*, loja, usuario, papel: str, texto: str) -> dict:
    from .provedores.offline import intencao

    texto = (texto or "").strip()[:500]
    # cadastro de cliente traz nome de pessoa (não mascarável com segurança): fica sempre local
    provedor = ProvedorOffline() if intencao(texto) == "cliente" else escolher_provedor()
    sessao = SessaoAgente.objects.create(loja=loja, usuario=usuario, provedor=provedor.nome)
    ctx = Contexto(loja=loja, usuario=usuario, papel=papel, sessao=sessao)
    mascarado, mapa = mascarar(texto)
    passos = {"n": 0}

    def chamar(nome: str, args: dict):
        passos["n"] += 1
        if passos["n"] > settings.MIDIA_AGENTE_MAX_PASSOS:
            raise RuntimeError("Limite de passos do agente atingido.")
        f = obter(nome, papel)  # bloqueia ferramenta acima do papel
        t0 = time.monotonic()
        ok, resumo = True, ""
        try:
            saida = f.funcao(ctx, **restaurar(args, mapa))
            resumo = str(saida)[:300]
            return saida
        except Exception as exc:
            ok, resumo = False, str(exc)[:300]
            raise
        finally:
            ChamadaFerramenta.objects.create(
                loja=loja, sessao=sessao, usuario=usuario, ferramenta=nome,
                entrada=args,  # mascarada
                saida_resumo=mascarar(resumo)[0], ok=ok,
                duracao_ms=int((time.monotonic() - t0) * 1000),
            )  # fmt: skip

    try:
        resposta = provedor.executar(ctx, mascarado, chamar)
    except Exception as exc:  # noqa: BLE001
        if provedor.nome == "offline":
            raise
        log.warning("Falha no provedor %s (%s); refazendo offline.", provedor.nome, exc)
        sessao.provedor = "offline"
        sessao.save(update_fields=["provedor"])
        ctx.propostas.clear()
        resposta = ProvedorOffline().executar(ctx, mascarado, chamar)
    return {
        "sessao_id": sessao.id,
        "provedor": sessao.provedor,
        "resposta": restaurar(resposta, mapa),
        "propostas": list(ctx.propostas),
    }
