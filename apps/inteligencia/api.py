from datetime import date, datetime
from decimal import Decimal

from django.utils import timezone
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from apps.acoes.auditoria import registrar_evento
from apps.core.permissoes import loja_com_papel

from . import motor
from .models import ExecucaoMotor, Oportunidade

router = Router(tags=["Oportunidades"])


class EvidenciaOut(Schema):
    fonte: str
    descricao: str
    valor: Decimal
    periodo_inicio: date
    periodo_fim: date
    amostra: int


class OportunidadeOut(Schema):
    id: int
    regra: str
    regra_nome: str
    versao_regra: str
    status: str
    titulo: str
    acao_sugerida: str
    limitacao: str
    medicao_sugerida: str
    explicacao: str
    alvo: dict
    prioridade: int
    evidencias: list[EvidenciaOut]
    plano_id: int | None
    descartada_em: datetime | None


class BloqueioOut(Schema):
    regra: str
    nome: str
    motivo: str | None
    como_liberar: str | None


class ExecucaoOut(Schema):
    id: int
    janela_inicio: date
    janela_fim: date
    executado_em: datetime


class PainelOut(Schema):
    execucao: ExecucaoOut
    qualidade: dict
    cartoes: list[OportunidadeOut]
    bloqueios: list[BloqueioOut]


class DescartarIn(Schema):
    justificativa: str = Field(..., min_length=3, max_length=500)


NOMES = {r.codigo: r.nome for r in motor.REGRAS}


def _op_out(o: Oportunidade) -> dict:
    plano = getattr(o, "plano", None)
    return {
        "id": o.id,
        "regra": o.regra,
        "regra_nome": NOMES.get(o.regra, o.regra),
        "versao_regra": o.versao_regra,
        "status": o.status,
        "titulo": o.titulo,
        "acao_sugerida": o.acao_sugerida,
        "limitacao": o.limitacao,
        "medicao_sugerida": o.medicao_sugerida,
        "explicacao": o.explicacao,
        "alvo": o.alvo,
        "prioridade": o.prioridade,
        "evidencias": list(o.evidencias.all()),
        "plano_id": plano.id if plano else None,
        "descartada_em": o.descartada_em,
    }


def _painel(execucao: ExecucaoMotor) -> dict:
    cartoes = (
        execucao.oportunidades.filter(descartada_em__isnull=True)
        .select_related("plano")
        .prefetch_related("evidencias")
    )
    return {
        "execucao": execucao,
        "qualidade": execucao.qualidade,
        "cartoes": [_op_out(o) for o in cartoes],
        "bloqueios": execucao.bloqueios,
    }


@router.get("/", response=PainelOut)
def painel(request):
    loja = loja_com_papel(request, "gerente")
    execucao = ExecucaoMotor.objects.da_loja(loja).order_by("-executado_em").first()
    if execucao is None:
        execucao = motor.gerar(loja)
    return _painel(execucao)


@router.post("/gerar", response=PainelOut)
def gerar(request, fim: date | None = None):
    loja = loja_com_papel(request, "gerente")
    return _painel(motor.gerar(loja, fim))


def _buscar(loja, oportunidade_id: int) -> Oportunidade:
    o = (
        Oportunidade.objects.da_loja(loja)
        .select_related("plano")
        .prefetch_related("evidencias")
        .filter(pk=oportunidade_id)
        .first()
    )
    if o is None:
        raise HttpError(404, "Oportunidade não encontrada.")
    return o


@router.get("/{int:oportunidade_id}", response=OportunidadeOut)
def detalhe(request, oportunidade_id: int):
    loja = loja_com_papel(request, "gerente")
    return _op_out(_buscar(loja, oportunidade_id))


@router.post("/{int:oportunidade_id}/descartar", response=OportunidadeOut)
def descartar(request, oportunidade_id: int, payload: DescartarIn):
    loja = loja_com_papel(request, "gerente")
    o = _buscar(loja, oportunidade_id)
    if o.descartada_em:
        raise HttpError(409, "Essa oportunidade já foi descartada.")
    if getattr(o, "plano", None):
        raise HttpError(409, "Já existe um plano de ação para essa oportunidade.")
    o.descartada_em = timezone.now()
    o.justificativa_descarte = payload.justificativa
    o.save(update_fields=["descartada_em", "justificativa_descarte"])
    registrar_evento(
        loja, request.user, "oportunidade_descartada", f"oportunidade:{o.pk}",
        justificativa=payload.justificativa,
    )  # fmt: skip
    return _op_out(o)
