"""API de oportunidades.

Contrato (docs/18): o GET só LÊ (nunca calcula nem grava); o POST /gerar calcula, mas
devolve a análise vigente se os dados não mudaram. Campos novos são aditivos: o que a
tela já usa continua igual.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal

from django.utils import timezone
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from apps.acoes.auditoria import registrar_evento
from apps.core.permissoes import loja_com_papel

from . import motor
from .models import ExecucaoMotor, Oportunidade
from .revisao import VERSAO_MOTOR, fontes, revisao

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
    # aditivos (UX-07 / docs/18)
    execucao_id: int
    chave: str
    resumo: str
    numeros: list[dict]
    passos: list[str]
    alternativas: list[dict]
    frescor: dict
    adiada_ate: datetime | None
    estado_decisao: Literal["aberta", "com_acao", "descartada", "adiada"]
    acoes_disponiveis: list[str]
    da_analise_vigente: bool


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
    revisao_dados: str
    versao_motor: str
    duracao_ms: int
    desatualizada: bool  # há dados novos (ou motor novo) desde esta análise


class PainelOut(Schema):
    # sem_execucao: a loja nunca foi analisada → a tela oferece "Gerar primeira análise"
    estado: Literal["pronto", "sem_execucao"]
    execucao: ExecucaoOut | None
    qualidade: dict
    cartoes: list[OportunidadeOut]
    bloqueios: list[BloqueioOut]
    fontes: dict
    tratadas: int  # cartões desta análise já decididos (ação, descarte ou adiamento)
    reaproveitada: bool = False  # POST /gerar: os dados não mudaram, é a mesma análise


class DescartarIn(Schema):
    justificativa: str = Field(..., min_length=3, max_length=500)


class AdiarIn(Schema):
    dias: int = Field(3, ge=1, le=14)


NOMES = {r.codigo: r.nome for r in motor.REGRAS}


def _estado_decisao(o: Oportunidade, plano) -> str:
    if plano:
        return "com_acao"
    if o.descartada_em:
        return "descartada"
    if o.adiada_ate and o.adiada_ate > timezone.now():
        return "adiada"
    return "aberta"


def _op_out(o: Oportunidade, vigente_id: int | None = None) -> dict:
    plano = getattr(o, "plano", None)
    estado = _estado_decisao(o, plano)
    if vigente_id is None:
        v = motor.vigente(o.loja)
        vigente_id = v.id if v else None
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
        "execucao_id": o.execucao_id,
        "chave": o.chave,
        "resumo": o.resumo,
        "numeros": o.numeros,
        "passos": o.passos,
        "alternativas": o.alternativas,
        "frescor": o.frescor,
        "adiada_ate": o.adiada_ate,
        "estado_decisao": estado,
        "acoes_disponiveis": ["criar_acao", "descartar", "adiar"] if estado == "aberta" else [],
        "da_analise_vigente": o.execucao_id == vigente_id,
    }


def _painel(loja, execucao: ExecucaoMotor | None, reaproveitada: bool = False) -> dict:
    if execucao is None:
        return {
            "estado": "sem_execucao",
            "execucao": None,
            "qualidade": {},
            "cartoes": [],
            "bloqueios": [],
            "fontes": fontes(loja),
            "tratadas": 0,
        }
    todos = list(
        execucao.oportunidades.select_related("plano", "loja").prefetch_related("evidencias")
    )
    abertos = [o for o in todos if _estado_decisao(o, getattr(o, "plano", None)) != "descartada"]
    abertos = [o for o in abertos if not (o.adiada_ate and o.adiada_ate > timezone.now())]
    execucao.desatualizada = (
        execucao.versao_motor != VERSAO_MOTOR or execucao.revisao_dados != revisao(loja)
    )
    return {
        "estado": "pronto",
        "execucao": execucao,
        "qualidade": execucao.qualidade,
        "cartoes": [_op_out(o, execucao.id) for o in abertos],
        "bloqueios": execucao.bloqueios,
        "fontes": fontes(loja),
        "tratadas": sum(
            1 for o in todos if _estado_decisao(o, getattr(o, "plano", None)) != "aberta"
        ),
        "reaproveitada": reaproveitada,
    }


@router.get("/", response=PainelOut)
def painel(request):
    """Só lê a análise vigente. Nunca calcula (isso é do POST /gerar)."""
    loja = loja_com_papel(request, "gerente")
    return _painel(loja, motor.vigente(loja))


@router.post("/gerar", response=PainelOut)
def gerar(request, fim: date | None = None):
    loja = loja_com_papel(request, "gerente")
    r = motor.calcular(loja, fim)
    return _painel(loja, r.execucao, reaproveitada=r.reaproveitada)


def _buscar(loja, oportunidade_id: int) -> Oportunidade:
    o = (
        Oportunidade.objects.da_loja(loja)
        .select_related("plano", "loja")
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


def _exigir_aberta(o: Oportunidade) -> None:
    if o.descartada_em:
        raise HttpError(409, "Essa oportunidade já foi descartada.")
    if getattr(o, "plano", None):
        raise HttpError(409, "Já existe um plano de ação para essa oportunidade.")


@router.post("/{int:oportunidade_id}/descartar", response=OportunidadeOut)
def descartar(request, oportunidade_id: int, payload: DescartarIn):
    loja = loja_com_papel(request, "gerente")
    o = _buscar(loja, oportunidade_id)
    _exigir_aberta(o)
    o.descartada_em = timezone.now()
    o.justificativa_descarte = payload.justificativa
    o.save(update_fields=["descartada_em", "justificativa_descarte"])
    registrar_evento(
        loja, request.user, "oportunidade_descartada", f"oportunidade:{o.pk}",
        justificativa=payload.justificativa,
    )  # fmt: skip
    return _op_out(o)


@router.post("/{int:oportunidade_id}/adiar", response=OportunidadeOut)
def adiar(request, oportunidade_id: int, payload: AdiarIn):
    """ "Lembrar depois" (UX-07): some do painel por N dias e não volta num recálculo
    antes disso. Depois do prazo, se o sinal continuar, reaparece."""
    loja = loja_com_papel(request, "gerente")
    o = _buscar(loja, oportunidade_id)
    _exigir_aberta(o)
    o.adiada_ate = timezone.now() + timedelta(days=payload.dias)
    o.save(update_fields=["adiada_ate"])
    registrar_evento(
        loja, request.user, "oportunidade_adiada", f"oportunidade:{o.pk}", dias=payload.dias,
    )  # fmt: skip
    return _op_out(o)
