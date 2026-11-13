"""Orquestrador: loja da sessão, ferramentas por papel, validação, mascaramento, auditoria,
memória curta e fallback offline.

É o "grafo" do agente, escrito à mão: entrada → (provedor escolhe ferramentas → valida →
executa → audita)* → resposta. As pausas para a pessoa confirmar não são estado em memória:
são PropostaAgente pendentes no banco, que sobrevivem a reinício e a troca de aparelho.
"""

from __future__ import annotations

import logging
import time

from django.conf import settings

from .ferramentas import Contexto, obter, validar_args
from .models import ChamadaFerramenta, PropostaAgente, SessaoAgente
from .privacidade import mascarar, restaurar
from .provedores.offline import ProvedorOffline, intencao

log = logging.getLogger(__name__)

# frase de cadastro traz nome de pessoa, que não dá para mascarar com segurança:
# ela nunca vai para o LLM e também não entra na memória que o LLM lê depois
_CADASTRO_LOCAL = "[cadastro de cliente tratado localmente]"


class SessaoInvalida(Exception):
    pass


def escolher_provedor():
    if settings.MIDIA_IA_HABILITADA and settings.MIDIA_IA_PROVEDOR == "hermes":
        from .provedores.hermes import ProvedorHermes  # sem SDK: só socket da ponte

        return ProvedorHermes()
    if settings.MIDIA_IA_HABILITADA and settings.MIDIA_IA_PROVEDOR == "claude":
        try:
            from .provedores.claude import ProvedorClaude

            return ProvedorClaude()
        except Exception as exc:  # noqa: BLE001
            log.warning("Provedor Claude indisponível (%s); usando offline.", exc)
    return ProvedorOffline()


def _sessao(loja, usuario, sessao_id: int | None) -> SessaoAgente:
    if sessao_id is None:
        return SessaoAgente.objects.create(loja=loja, usuario=usuario)
    s = SessaoAgente.objects.da_loja(loja).filter(pk=sessao_id, usuario=usuario).first()
    if s is None:  # outra loja ou outra pessoa: não existe para quem pediu
        raise SessaoInvalida("Conversa não encontrada.")
    return s


def processar(
    *, loja, usuario, papel: str, texto: str, canal: str = "texto", sessao_id: int | None = None
) -> dict:
    t0 = time.monotonic()
    texto = (texto or "").strip()[:500]
    local = intencao(texto) == "cliente"
    provedor = ProvedorOffline() if local else escolher_provedor()
    sessao = _sessao(loja, usuario, sessao_id)
    ctx = Contexto(loja=loja, usuario=usuario, papel=papel, sessao=sessao)
    mascarado, mapa = mascarar(texto)
    passos = {"n": 0}

    def chamar(nome: str, args: dict):
        passos["n"] += 1
        if passos["n"] > settings.MIDIA_AGENTE_MAX_PASSOS:
            raise RuntimeError("Limite de passos do agente atingido.")
        f = obter(nome, papel)  # bloqueia ferramenta acima do papel
        t1 = time.monotonic()
        ok, resumo = True, ""
        try:
            limpos = validar_args(f, args)  # erro aqui volta ao LLM para ele corrigir
            saida = f.funcao(ctx, **restaurar(limpos, mapa))
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
                duracao_ms=int((time.monotonic() - t1) * 1000),
            )  # fmt: skip

    fallback = ""
    try:
        resposta = provedor.executar(ctx, mascarado, chamar, list(sessao.historico))
    except Exception as exc:  # noqa: BLE001
        if provedor.nome == "offline":
            raise
        log.warning("Falha no provedor %s (%s); refazendo offline.", provedor.nome, exc)
        fallback = f"{type(exc).__name__}: {exc}"[:200]
        # o que o LLM deixou pela metade some: a pessoa só vê a versão offline, inteira
        ids = [p.id for p in ctx.propostas]
        PropostaAgente.objects.filter(id__in=ids, status=PropostaAgente.Status.PENDENTE).delete()
        ctx.propostas.clear()
        passos["n"] = 0
        uso_llm = provedor.uso
        provedor = ProvedorOffline()
        provedor.uso = uso_llm  # tokens gastos antes da falha contam
        resposta = provedor.executar(ctx, mascarado, chamar, [])

    fala = _CADASTRO_LOCAL if local else mascarado
    historico = [
        *sessao.historico,
        {"role": "user", "content": fala},
        {"role": "assistant", "content": resposta or "-"},
    ]
    n = settings.MIDIA_AGENTE_HISTORICO
    sessao.historico = historico[-(n - n % 2) :] if n else []  # sempre começa no usuário
    sessao.provedor = provedor.nome
    sessao.modelo = getattr(provedor, "modelo", "") or sessao.modelo
    sessao.canal = canal
    sessao.turnos += 1
    sessao.passos += passos["n"]
    sessao.tokens_entrada += provedor.uso.tokens_entrada
    sessao.tokens_saida += provedor.uso.tokens_saida
    sessao.duracao_ms += int((time.monotonic() - t0) * 1000)
    sessao.fallback = fallback
    sessao.save()
    return {
        "sessao_id": sessao.id,
        "provedor": sessao.provedor,
        "resposta": restaurar(resposta, mapa),
        "propostas": list(ctx.propostas),
    }
