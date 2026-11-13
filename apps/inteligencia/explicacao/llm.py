"""IA opcional (§9). Desligada por padrão (MIDIA_IA_HABILITADA=False).

A IA não calcula nada: recebe só fatos aprovados (agregados) e reescreve o texto.
Qualquer falha ou saída reprovada → volta para o template.
"""

import re

from django.conf import settings

from ..regras.base import OportunidadeCandidata
from .template import ExplicadorTemplate

_NUM = re.compile(r"\d+(?:[.,]\d+)?")


def validar_saida(texto: str, op: OportunidadeCandidata) -> bool:
    """Todo número do texto precisa existir nos fatos aprovados."""
    fatos = " ".join(
        [op.titulo, op.limitacao, op.acao_sugerida, *[e.descricao for e in op.evidencias]]
    )
    permitidos = set(_NUM.findall(fatos))
    return all(n in permitidos for n in _NUM.findall(texto))


class ExplicadorLLM:
    """Interface trocável. Integração real com provedor fica para P1."""

    def __init__(self, cliente=None):
        self.cliente = cliente
        self.fallback = ExplicadorTemplate()

    def explicar(self, op: OportunidadeCandidata, status: str) -> str:
        base = self.fallback.explicar(op, status)
        if not settings.MIDIA_IA_HABILITADA or self.cliente is None:
            return base
        try:
            texto = self.cliente.reescrever(base)  # só agregados; nunca dado pessoal
        except Exception:  # noqa: BLE001 - qualquer falha cai no template
            return base
        return texto if texto and validar_saida(texto, op) else base


def explicador():
    return ExplicadorLLM() if settings.MIDIA_IA_HABILITADA else ExplicadorTemplate()
