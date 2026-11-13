"""API JSON do MidiaComercial (Django Ninja). Docs em /api/docs, contrato em /api/openapi.json.

Erros sempre no formato {"detail": str, "erros"?: [...], "codigo"?: str} (FRONTEND.md §8.2).
"""

from django.core.exceptions import PermissionDenied
from django.http import Http404
from ninja import NinjaAPI
from ninja.errors import AuthenticationError, HttpError, ValidationError
from ninja.security import django_auth

from apps.acoes.api import router as acoes_router
from apps.agente.api import router as agente_router
from apps.clientes.api import router as clientes_router
from apps.contas.api import router as contas_router
from apps.core.api import router as core_router
from apps.core.permissoes import SemLoja
from apps.importacao.api import router as importacao_router
from apps.inteligencia.api import router as inteligencia_router
from apps.publico.api import analises_router, catalogo_router, demandas_router

api = NinjaAPI(
    title="MidiaComercial API",
    version="1.0",
    description="Seus sinais de venda, em uma só mídia. Auth por sessão Django + CSRF.",
    auth=django_auth,
)

api.add_router("/", core_router)
api.add_router("/", contas_router)
api.add_router("/importacoes", importacao_router)
api.add_router("/analises", analises_router)
api.add_router("/catalogo", catalogo_router)
api.add_router("/demandas", demandas_router)
api.add_router("/oportunidades", inteligencia_router)
api.add_router("/acoes", acoes_router)
api.add_router("/clientes", clientes_router)
api.add_router("/agente", agente_router)


@api.exception_handler(SemLoja)
def _sem_loja(request, exc):
    return api.create_response(
        request, {"detail": "Escolha uma loja para continuar.", "codigo": "sem_loja"}, status=409
    )


@api.exception_handler(PermissionDenied)
def _proibido(request, exc):
    msg = str(exc) or "Você não tem permissão para isso."
    return api.create_response(request, {"detail": msg, "codigo": "proibido"}, status=403)


@api.exception_handler(Http404)
def _nao_encontrado(request, exc):
    return api.create_response(
        request, {"detail": "Não encontrado.", "codigo": "nao_encontrado"}, status=404
    )


@api.exception_handler(AuthenticationError)
def _nao_autenticado(request, exc):
    return api.create_response(
        request, {"detail": "Faça login para continuar.", "codigo": "nao_autenticado"}, status=401
    )


@api.exception_handler(HttpError)
def _http_error(request, exc: HttpError):
    return api.create_response(request, {"detail": str(exc)}, status=exc.status_code)


@api.exception_handler(ValidationError)
def _validacao(request, exc: ValidationError):
    erros = [
        {
            "campo": ".".join(str(p) for p in e.get("loc", [])[1:]) or None,
            "mensagem": e.get("msg", "valor inválido"),
        }
        for e in exc.errors
    ]
    return api.create_response(
        request,
        {"detail": "Alguns campos precisam de correção.", "erros": erros, "codigo": "validacao"},
        status=422,
    )
