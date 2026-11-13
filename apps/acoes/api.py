from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from ninja import Field, Router, Schema, Status
from ninja.errors import HttpError

from apps.core.permissoes import loja_com_papel
from apps.inteligencia.models import Oportunidade

from . import services
from .models import PlanoAcao

router = Router(tags=["Plano de ação"])

Situacao = Literal["aberta", "concluida", "descartada"]


class MedicaoOut(Schema):
    id: int
    periodo_antes_inicio: date
    periodo_antes_fim: date
    periodo_depois_inicio: date
    periodo_depois_fim: date
    valor_antes: Decimal
    valor_depois: Decimal | None
    contexto: str
    criado_em: datetime


class OportunidadeResumo(Schema):
    id: int
    regra: str
    titulo: str
    status: str


class PlanoOut(Schema):
    id: int
    titulo: str
    responsavel: str
    prazo: date
    indicador: str
    situacao: Situacao
    justificativa: str
    criado_em: datetime
    atrasado: bool
    oportunidade: OportunidadeResumo | None
    medicoes: list[MedicaoOut]


class PlanoIn(Schema):
    oportunidade_id: int | None = None
    titulo: str | None = Field(None, max_length=200)
    responsavel: str = Field(..., min_length=1, max_length=80)
    prazo: date
    indicador: str | None = Field(None, max_length=200)


class PlanoPatch(Schema):
    situacao: Situacao | None = None
    justificativa: str | None = Field(None, max_length=1000)
    responsavel: str | None = Field(None, max_length=80)
    prazo: date | None = None


class MedicaoIn(Schema):
    periodo_antes_inicio: date
    periodo_antes_fim: date
    periodo_depois_inicio: date
    periodo_depois_fim: date
    valor_antes: Decimal = Field(..., ge=0)
    valor_depois: Decimal | None = Field(None, ge=0)
    contexto: str | None = Field(None, max_length=1000)


class SugestaoMedicaoOut(Schema):
    periodo_antes_inicio: date
    periodo_antes_fim: date
    periodo_depois_inicio: date
    periodo_depois_fim: date
    valor_antes: Decimal
    valor_depois: Decimal
    unidade: str
    periodo_depois_completo: bool


def _plano_out(p: PlanoAcao) -> dict:
    from django.utils import timezone

    return {
        "id": p.id,
        "titulo": p.titulo,
        "responsavel": p.responsavel,
        "prazo": p.prazo,
        "indicador": p.indicador,
        "situacao": p.situacao,
        "justificativa": p.justificativa,
        "criado_em": p.criado_em,
        "atrasado": p.situacao == "aberta" and p.prazo < timezone.localdate(),
        "oportunidade": p.oportunidade,
        "medicoes": list(p.medicoes.order_by("-criado_em")),
    }


def _buscar(loja, plano_id: int) -> PlanoAcao:
    p = (
        PlanoAcao.objects.da_loja(loja)
        .select_related("oportunidade")
        .prefetch_related("medicoes")
        .filter(pk=plano_id)
        .first()
    )
    if p is None:
        raise HttpError(404, "Plano não encontrado.")
    return p


@router.get("/", response=list[PlanoOut])
def listar(request, situacao: Situacao | None = None):
    loja = loja_com_papel(request, "gerente")
    qs = (
        PlanoAcao.objects.da_loja(loja)
        .select_related("oportunidade")
        .prefetch_related("medicoes")
        .order_by("situacao", "prazo")
    )
    if situacao:
        qs = qs.filter(situacao=situacao)
    return [_plano_out(p) for p in qs]


@router.post("/", response={201: PlanoOut})
def criar(request, payload: PlanoIn):
    loja = loja_com_papel(request, "gerente")
    try:
        plano = services.criar_plano(loja=loja, usuario=request.user, dados=payload)
    except Oportunidade.DoesNotExist as exc:
        raise HttpError(404, "Oportunidade não encontrada.") from exc
    except services.AcaoErro as exc:
        raise HttpError(409, str(exc)) from exc
    return Status(201, _plano_out(_buscar(loja, plano.id)))


@router.get("/{int:plano_id}", response=PlanoOut)
def detalhe(request, plano_id: int):
    loja = loja_com_papel(request, "gerente")
    return _plano_out(_buscar(loja, plano_id))


@router.patch("/{int:plano_id}", response=PlanoOut)
def atualizar(request, plano_id: int, payload: PlanoPatch):
    loja = loja_com_papel(request, "gerente")
    plano = _buscar(loja, plano_id)
    try:
        services.atualizar_plano(loja=loja, usuario=request.user, plano=plano, dados=payload)
    except services.AcaoErro as exc:
        raise HttpError(409, str(exc)) from exc
    return _plano_out(_buscar(loja, plano_id))


@router.get("/{int:plano_id}/medicao-sugerida", response={200: SugestaoMedicaoOut, 204: None})
def medicao_sugerida(request, plano_id: int):
    loja = loja_com_papel(request, "gerente")
    sugestao = services.sugerir_medicao(loja, _buscar(loja, plano_id))
    if sugestao is None:
        return Status(204, None)
    return Status(200, sugestao)


@router.post("/{int:plano_id}/medicoes", response={201: PlanoOut})
def medir(request, plano_id: int, payload: MedicaoIn):
    loja = loja_com_papel(request, "gerente")
    plano = _buscar(loja, plano_id)
    if payload.periodo_antes_inicio > payload.periodo_antes_fim or (
        payload.periodo_depois_inicio > payload.periodo_depois_fim
    ):
        raise HttpError(422, "Período inválido: o início precisa vir antes do fim.")
    services.registrar_medicao(loja=loja, usuario=request.user, plano=plano, dados=payload)
    return Status(201, _plano_out(_buscar(loja, plano_id)))
