from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Literal

from django.conf import settings
from django.http import HttpResponse
from ninja import File, Form, Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.core.permissoes import loja_com_papel

from . import services
from .models import LoteImportacao

router = Router(tags=["Importação"])


class ErroCampo(Schema):
    campo: str | None
    mensagem: str


class LinhaRejeitadaOut(Schema):
    numero_linha: int
    erros: list[ErroCampo]


class ReconciliacaoOut(Schema):
    origem: Decimal
    importado: Decimal
    diferenca: Decimal
    percentual: Decimal
    nivel: Literal["ok", "atencao", "alto"]


class LoteOut(Schema):
    id: int
    tipo: str
    status: str
    nome_arquivo: str
    linhas_ok: int
    linhas_rejeitadas: int
    linhas_duplicadas: int
    total_importado: Decimal
    total_origem_informado: Decimal | None
    criado_em: datetime
    confirmado_em: datetime | None
    reconciliacao: ReconciliacaoOut | None
    previa: list[dict]
    rejeitadas: list[LinhaRejeitadaOut]


class LoteResumoOut(Schema):
    id: int
    tipo: str
    status: str
    nome_arquivo: str
    linhas_ok: int
    linhas_rejeitadas: int
    total_importado: Decimal
    criado_em: datetime


def _lote_out(lote: LoteImportacao) -> dict:
    return {
        "id": lote.id,
        "tipo": lote.tipo,
        "status": lote.status,
        "nome_arquivo": lote.nome_arquivo,
        "linhas_ok": lote.linhas_ok,
        "linhas_rejeitadas": lote.linhas_rejeitadas,
        "linhas_duplicadas": lote.linhas_duplicadas,
        "total_importado": lote.total_importado,
        "total_origem_informado": lote.total_origem_informado,
        "criado_em": lote.criado_em,
        "confirmado_em": lote.confirmado_em,
        "reconciliacao": services.reconciliacao(lote),
        "previa": lote.linhas_pendentes[:5],
        "rejeitadas": [
            {"numero_linha": r.numero_linha, "erros": r.erros} for r in lote.rejeitadas.all()[:100]
        ],
    }


def _decimal_br(valor: str | None) -> Decimal | None:
    if valor is None or not str(valor).strip():
        return None
    v = str(valor).strip().replace("R$", "").strip()
    if "," in v:
        v = v.replace(".", "").replace(",", ".")
    try:
        return Decimal(v).quantize(Decimal("0.01"))
    except InvalidOperation as exc:
        raise HttpError(422, "Total de origem inválido. Use o formato 18.432,90.") from exc


@router.post("/preview", response=LoteOut)
def preview(
    request,
    arquivo: UploadedFile = File(...),
    tipo: Literal["vendas", "estoque"] = Form("vendas"),
    total_origem: str | None = Form(None),
):
    loja = loja_com_papel(request, "gerente")
    if arquivo.size > settings.UPLOAD_MAX_BYTES:
        raise HttpError(413, "Arquivo maior que 5 MB. Divida em partes menores.")
    try:
        lote = services.gerar_previa(
            loja=loja,
            usuario=request.user,
            nome_arquivo=arquivo.name or "arquivo.csv",
            conteudo=arquivo.read(),
            tipo=tipo,
            total_origem=_decimal_br(total_origem),
        )
    except services.ImportacaoErro as exc:
        raise HttpError(422, str(exc)) from exc
    return _lote_out(lote)


@router.get("/", response=list[LoteResumoOut])
def listar(request):
    loja = loja_com_papel(request, "gerente")
    return LoteImportacao.objects.da_loja(loja).order_by("-criado_em")[:20]


@router.get("/modelo", auth=None, include_in_schema=True)
def modelo(request, tipo: Literal["vendas", "estoque"] = "vendas"):
    conteudo = services.MODELO_VENDAS if tipo == "vendas" else services.MODELO_ESTOQUE
    resp = HttpResponse(conteudo.encode("utf-8-sig"), content_type="text/csv; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="modelo_{tipo}.csv"'
    return resp


@router.get("/exemplo")
def exemplo(request):
    """CSV sintético da loja atual (novos pedidos + erros e duplicadas de propósito) para a demo."""
    from apps.core.demo import csv_exemplo_vendas

    loja = loja_com_papel(request, "gerente")
    resp = HttpResponse(
        csv_exemplo_vendas(loja).encode("utf-8-sig"), content_type="text/csv; charset=utf-8"
    )
    resp["Content-Disposition"] = 'attachment; filename="vendas_exemplo_demo.csv"'
    return resp


@router.get("/{int:lote_id}", response=LoteOut)
def detalhe(request, lote_id: int):
    loja = loja_com_papel(request, "gerente")
    lote = LoteImportacao.objects.da_loja(loja).filter(pk=lote_id).first()
    if lote is None:
        raise HttpError(404, "Lote não encontrado.")
    return _lote_out(lote)


@router.post("/{int:lote_id}/confirmar", response=LoteOut)
def confirmar(request, lote_id: int):
    loja = loja_com_papel(request, "gerente")
    if not LoteImportacao.objects.da_loja(loja).filter(pk=lote_id).exists():
        raise HttpError(404, "Lote não encontrado.")
    try:
        lote = services.confirmar(loja=loja, usuario=request.user, lote_id=lote_id)
    except services.ImportacaoErro as exc:
        raise HttpError(409, str(exc)) from exc
    return _lote_out(lote)


@router.post("/{int:lote_id}/cancelar", response=LoteOut)
def cancelar(request, lote_id: int):
    loja = loja_com_papel(request, "gerente")
    if not LoteImportacao.objects.da_loja(loja).filter(pk=lote_id).exists():
        raise HttpError(404, "Lote não encontrado.")
    try:
        lote = services.cancelar(loja=loja, usuario=request.user, lote_id=lote_id)
    except services.ImportacaoErro as exc:
        raise HttpError(409, str(exc)) from exc
    return _lote_out(lote)
