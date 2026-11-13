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


class ArgumentoInvalido(ValueError):
    """Volta ao LLM como erro da ferramenta, para ele corrigir a chamada."""


_TIPOS = {
    "string": str, "integer": int, "number": (int, float), "boolean": bool,
    "array": list, "object": dict, "null": type(None),
}  # fmt: skip


def validar_args(f: Ferramenta, args: dict) -> dict:
    """Confere a chamada contra o JSON Schema da ferramenta: descarta chave desconhecida,
    exige as obrigatórias e checa tipo e enum. Sem dependência nova."""
    props = f.parametros.get("properties", {})
    faltando = [k for k in f.parametros.get("required", []) if args.get(k) is None]
    if faltando:
        raise ArgumentoInvalido(f"{f.nome}: faltou {', '.join(faltando)}.")
    limpos = {}
    for k, v in args.items():
        regra = props.get(k)
        if regra is None:
            continue  # o modelo inventou um campo: ignora em vez de quebrar
        tipos = regra.get("type", [])
        tipos = [tipos] if isinstance(tipos, str) else tipos
        aceitos = tuple(t for nome in tipos for t in _flat(_TIPOS.get(nome, object)))
        if tipos and (
            not isinstance(v, aceitos) or (isinstance(v, bool) and "boolean" not in tipos)
        ):
            raise ArgumentoInvalido(f"{f.nome}: {k} deveria ser {'/'.join(tipos)}.")
        if "enum" in regra and v not in regra["enum"]:
            validos = ", ".join(str(x) for x in regra["enum"] if x is not None)
            raise ArgumentoInvalido(f"{f.nome}: {k}={v!r} inválido. Use: {validos}.")
        limpos[k] = v
    return limpos


def _flat(t):
    return t if isinstance(t, tuple) else (t,)


def obter(nome: str, papel: str | None) -> Ferramenta:
    f = REGISTRO.get(nome)
    if f is None:
        raise FerramentaNegada(f"Ferramenta desconhecida: {nome}")
    if HIERARQUIA.get(papel or "", 0) < HIERARQUIA[f.papel_minimo]:
        raise FerramentaNegada(f"Seu papel não permite usar {nome}.")
    return f


# registra as ferramentas
from . import balcao, clientes, publico  # noqa: E402, F401
