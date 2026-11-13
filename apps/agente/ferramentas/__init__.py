"""Registro de ferramentas do agente.

Regras: ferramenta recebe Contexto (loja/usuário/papel da sessão), lê com .da_loja() e,
quando "escreve", só cria PropostaAgente pendente. Dado de domínio só via services.confirmar().
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from apps.core.permissoes import HIERARQUIA


@dataclass
class Contexto:
    loja: object
    usuario: object
    papel: str
    sessao: object | None = None
    propostas: list = field(default_factory=list)  # PropostaAgente criadas nesta mensagem


@dataclass(frozen=True)
class Ferramenta:
    nome: str
    descricao: str
    papel_minimo: str
    parametros: dict  # JSON Schema (usado pelo provedor Claude)
    funcao: Callable


REGISTRO: dict[str, Ferramenta] = {}


def ferramenta(nome: str, descricao: str, papel_minimo: str, parametros: dict):
    def deco(fn):
        REGISTRO[nome] = Ferramenta(nome, descricao, papel_minimo, parametros, fn)
        return fn

    return deco


def disponiveis(papel: str | None) -> list[Ferramenta]:
    nivel = HIERARQUIA.get(papel or "", 0)
    return [f for f in REGISTRO.values() if nivel >= HIERARQUIA[f.papel_minimo]]


class FerramentaNegada(Exception):
    pass


def obter(nome: str, papel: str | None) -> Ferramenta:
    f = REGISTRO.get(nome)
    if f is None:
        raise FerramentaNegada(f"Ferramenta desconhecida: {nome}")
    if HIERARQUIA.get(papel or "", 0) < HIERARQUIA[f.papel_minimo]:
        raise FerramentaNegada(f"Seu papel não permite usar {nome}.")
    return f


# registra as ferramentas
from . import balcao, clientes, publico  # noqa: E402, F401
