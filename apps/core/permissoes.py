"""Papéis e loja da sessão (§8.1, §8.2).

A loja vem SEMPRE de request.loja (sessão validada contra o Vinculo pelo middleware).
"""

from django.core.exceptions import PermissionDenied

HIERARQUIA = {"atendente": 1, "gerente": 2, "dono": 3}


class SemLoja(Exception):
    """Usuário autenticado sem loja escolhida na sessão."""


def tem_papel(request, minimo: str) -> bool:
    return HIERARQUIA.get(request.papel or "", 0) >= HIERARQUIA[minimo]


def loja_com_papel(request, minimo: str = "atendente"):
    """Devolve a loja da sessão se o papel for suficiente; senão 409 (sem loja) ou 403."""
    if request.loja is None:
        raise SemLoja()
    if not tem_papel(request, minimo):
        raise PermissionDenied("Seu papel nesta loja não permite essa ação.")
    return request.loja
