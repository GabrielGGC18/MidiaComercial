"""Contrato dos provedores do agente.

Um provedor recebe a frase já mascarada e um `chamar(nome, args)` que o orquestrador
controla (papel, loja, limite de passos, validação e auditoria). Ele nunca toca no banco
direto: só decide QUAL ferramenta chamar e com QUAIS argumentos.

Trocar de LLM = escrever outra classe com este formato. Não há framework no meio
(ver docs/09-DECISAO-FRAMEWORK-IA.md).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol


@dataclass
class Uso:
    """Consumo do provedor numa mensagem (zero no offline)."""

    tokens_entrada: int = 0
    tokens_saida: int = 0


class Provedor(Protocol):
    nome: str
    modelo: str
    uso: Uso

    def executar(
        self, ctx, texto: str, chamar: Callable[[str, dict], dict], historico: list[dict]
    ) -> str:
        """Devolve a resposta em texto (pode conter tokens mascarados)."""
        ...
