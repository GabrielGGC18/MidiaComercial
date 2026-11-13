"""Padrão Observer: barramento de eventos de domínio.

Quem publica (services) não conhece quem observa. Observers se registram com @observa.
O disparo acontece só depois do COMMIT (transaction.on_commit): operação desfeita não notifica.
Observer com erro não derruba a operação nem os outros observers.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field

from django.db import transaction

log = logging.getLogger(__name__)


# Tipos de evento (contrato entre publicadores e observadores)
DEMANDA_LIMIAR = "demanda_limiar"  # variante chegou a N procuras sem estoque
OPORTUNIDADE_NOVA = "oportunidade_nova"  # motor gerou cartão com dados suficientes
CAMPANHA_PROPOSTA = "campanha_proposta"  # agente propôs contatos para produto em baixa
CLIENTE_COMPROU = "cliente_comprou"  # cliente contatado comprou a categoria em 14 dias
ACAO_ATRASADA = "acao_atrasada"  # plano aberto passou do prazo
IMPORTACAO_DIVERGENTE = "importacao_divergente"  # reconciliação com diferença alta
ESTOQUE_DESATUALIZADO = "estoque_desatualizado"  # estoque velho bloqueia regra B

TIPOS = {
    DEMANDA_LIMIAR, OPORTUNIDADE_NOVA, CAMPANHA_PROPOSTA, CLIENTE_COMPROU,
    ACAO_ATRASADA, IMPORTACAO_DIVERGENTE, ESTOQUE_DESATUALIZADO,
}  # fmt: skip


@dataclass(frozen=True)
class Evento:
    tipo: str
    loja: object
    dados: dict = field(default_factory=dict)
    chave: str = ""  # agrupamento: mesmo evento repetido vira contador, não spam


Observador = Callable[[Evento], None]
_OBSERVADORES: dict[str, list[Observador]] = defaultdict(list)


def observa(*tipos: str):
    """Registra um observador para um ou mais tipos ('*' = todos)."""

    def deco(fn: Observador) -> Observador:
        for t in tipos:
            if t != "*" and t not in TIPOS:
                raise ValueError(f"Tipo de evento desconhecido: {t}")
            if fn not in _OBSERVADORES[t]:
                _OBSERVADORES[t].append(fn)
        return fn

    return deco


def observadores(tipo: str) -> list[Observador]:
    return [*_OBSERVADORES.get(tipo, []), *_OBSERVADORES.get("*", [])]


def _despachar(evento: Evento) -> None:
    for fn in observadores(evento.tipo):
        try:
            fn(evento)
        except Exception:  # noqa: BLE001 - um observer quebrado não afeta os outros
            log.exception("Observer %s falhou para %s", getattr(fn, "__name__", fn), evento.tipo)


def publicar(tipo: str, loja, *, chave: str = "", **dados) -> Evento:
    if tipo not in TIPOS:
        raise ValueError(f"Tipo de evento desconhecido: {tipo}")
    evento = Evento(tipo=tipo, loja=loja, dados=dados, chave=chave or tipo)
    transaction.on_commit(lambda: _despachar(evento))
    return evento
