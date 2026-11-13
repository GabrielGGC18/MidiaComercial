"""Autenticação da SPA por sessão Django + CSRF (FRONTEND.md §8.2)."""

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.utils import check_csrf

from .models import Vinculo

router = Router(tags=["Sessão"])


class LojaOut(Schema):
    id: int
    nome: str
    segmento: str
    demo: bool
    papel: str


class UsuarioOut(Schema):
    id: int
    username: str
    nome: str
    is_staff: bool


class MeOut(Schema):
    usuario: UsuarioOut
    loja: LojaOut | None
    papel: str | None
    lojas: list[LojaOut]


class LoginIn(Schema):
    username: str
    password: str


class TrocarLojaIn(Schema):
    loja_id: int


class OkOut(Schema):
    ok: bool


def _loja_out(v: Vinculo) -> dict:
    return {
        "id": v.loja_id,
        "nome": v.loja.nome,
        "segmento": v.loja.segmento,
        "demo": v.loja.demo,
        "papel": v.papel,
    }


def montar_me(request) -> dict:
    user = request.user
    vinculos = list(user.vinculos.select_related("loja").order_by("loja__nome"))
    atual = next((v for v in vinculos if v.loja_id == request.session.get("loja_id")), None)
    return {
        "usuario": {
            "id": user.id,
            "username": user.get_username(),
            "nome": user.get_full_name() or user.get_username(),
            "is_staff": user.is_staff,
        },
        "loja": _loja_out(atual) if atual else None,
        "papel": atual.papel if atual else None,
        "lojas": [_loja_out(v) for v in vinculos],
    }


@router.get("/csrf", response=OkOut, auth=None)
def csrf(request):
    """Define o cookie csrftoken para a SPA."""
    get_token(request)
    return {"ok": True}


@router.post("/auth/login", response=MeOut, auth=None)
def entrar(request, payload: LoginIn):
    if check_csrf(request) is not None:
        raise HttpError(403, "Sessão expirada. Recarregue a página e tente de novo.")
    user = authenticate(request, username=payload.username, password=payload.password)
    if user is None or not user.is_active:
        raise HttpError(401, "Usuário ou senha inválidos.")
    login(request, user)  # signal user_logged_in grava loja_id se houver só uma
    return montar_me(request)


@router.post("/auth/logout", response=OkOut)
def sair(request):
    logout(request)
    return {"ok": True}


@router.get("/me", response=MeOut)
def me(request):
    return montar_me(request)


@router.post("/me/loja", response=MeOut)
def trocar_loja(request, payload: TrocarLojaIn):
    # valida contra o vínculo: loja alheia → 404 (não revela existência)
    if not request.user.vinculos.filter(loja_id=payload.loja_id).exists():
        raise HttpError(404, "Loja não encontrada.")
    request.session["loja_id"] = payload.loja_id
    return montar_me(request)
