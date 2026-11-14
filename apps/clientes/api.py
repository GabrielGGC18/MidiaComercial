from datetime import datetime
from decimal import Decimal

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from ninja import Field, File, Router, Schema, Status
from ninja.errors import HttpError
from ninja.files import UploadedFile

from apps.core.faixas import normalizar_faixa
from apps.core.permissoes import loja_com_papel

from . import services
from .models import Cliente

router = Router(tags=["Clientes"])


class ClienteOut(Schema):
    id: int
    ref: str
    nome: str
    whatsapp: str
    faixa_etaria: str
    faixa_rotulo: str
    tamanhos: list[str]
    categorias_interesse: list[str]
    observacao: str
    consentimento_contato: bool
    consentimento_em: datetime | None
    origem: str
    ultimo_contato_em: datetime | None
    em_descanso: bool
    pedidos: int
    ultima_compra: datetime | None
    gasto: Decimal
    categorias_compradas: list[str]


class ClienteIn(Schema):
    ref: str | None = Field(None, max_length=64)
    nome: str = Field("", max_length=120)
    whatsapp: str = Field("", max_length=30)
    faixa_etaria: str | None = None
    tamanhos: list[str] = []
    categorias_interesse: list[str] = []
    observacao: str = Field("", max_length=300)
    consentimento_contato: bool = False


class ImportacaoClientesOut(Schema):
    criados: int
    atualizados: int
    rejeitados: list[dict]


def _aplicar(c: Cliente, p: ClienteIn):
    try:
        c.whatsapp = services.normalizar_whatsapp(p.whatsapp)
        c.faixa_etaria = normalizar_faixa(p.faixa_etaria) or ""
    except ValueError as exc:
        raise HttpError(422, str(exc)) from exc
    c.nome = p.nome.strip()
    c.tamanhos = [t.strip() for t in p.tamanhos if t.strip()]
    c.categorias_interesse = [t.strip() for t in p.categorias_interesse if t.strip()]
    c.observacao = p.observacao.strip()
    if p.consentimento_contato and not c.consentimento_contato:
        c.consentimento_em = timezone.now()
    c.consentimento_contato = p.consentimento_contato


def _buscar(loja, cliente_id: int) -> Cliente:
    c = Cliente.objects.da_loja(loja).filter(pk=cliente_id).first()
    if c is None:
        raise HttpError(404, "Cliente não encontrado.")
    return c


class PaginaClientes(Schema):
    itens: list[ClienteOut]
    total: int
    pagina: int
    por_pagina: int
    paginas: int
    autorizados: int  # do total filtrado, não só da página


@router.get("/", response=PaginaClientes)
def listar(
    request,
    q: str = "",
    faixa: str = "",
    categoria: str = "",
    tamanho: str = "",
    consentimento: bool | None = None,
    sem_compra_dias: int | None = None,
    pagina: int = 1,
    por_pagina: int = 30,
):
    from apps.core.paginacao import paginar

    loja = loja_com_papel(request, "gerente")
    achados = services.buscar(
        loja, q=q[:80], faixa=faixa, categoria=categoria, tamanho=tamanho,
        consentimento=consentimento, sem_compra_dias=sem_compra_dias,
        limite=services.MAX_LINHAS,  # o total precisa contar todos, não só os 200 primeiros
    )  # fmt: skip
    autorizados = sum(1 for c in achados if c["consentimento_contato"])
    return paginar(achados, pagina, por_pagina) | {"autorizados": autorizados}


@router.post("/", response={201: ClienteOut})
def criar(request, payload: ClienteIn):
    loja = loja_com_papel(request, "gerente")
    ref = (payload.ref or "").strip() or services.novo_ref()
    if Cliente.objects.da_loja(loja).filter(ref=ref).exists():
        raise HttpError(409, "Já existe cliente com esse código.")
    c = Cliente(loja=loja, ref=ref, origem=Cliente.Origem.MANUAL)
    _aplicar(c, payload)
    c.save()
    return Status(201, services.detalhe(loja, c))


@router.get("/modelo", auth=None)
def modelo(request):
    resp = HttpResponse(
        services.MODELO_PLANILHA.encode("utf-8-sig"), content_type="text/csv; charset=utf-8"
    )
    resp["Content-Disposition"] = 'attachment; filename="modelo_clientes.csv"'
    return resp


@router.get("/exportar")
def exportar(request):
    loja = loja_com_papel(request, "gerente")
    resp = HttpResponse(
        services.exportar_csv(loja).encode("utf-8-sig"), content_type="text/csv; charset=utf-8"
    )
    resp["Content-Disposition"] = 'attachment; filename="clientes.csv"'
    return resp


@router.post("/importar", response=ImportacaoClientesOut)
def importar(request, arquivo: UploadedFile = File(...)):
    loja = loja_com_papel(request, "gerente")
    if arquivo.size > settings.UPLOAD_MAX_BYTES:
        raise HttpError(413, "Planilha maior que 5 MB.")
    try:
        r = services.importar_planilha(
            loja=loja,
            usuario=request.user,
            nome_arquivo=arquivo.name or "planilha",
            conteudo=arquivo.read(),
        )
    except services.PlanilhaErro as exc:
        raise HttpError(422, str(exc)) from exc
    return {"criados": r.criados, "atualizados": r.atualizados, "rejeitados": r.rejeitados}


@router.get("/{int:cliente_id}", response=ClienteOut)
def detalhe(request, cliente_id: int):
    loja = loja_com_papel(request, "gerente")
    return services.detalhe(loja, _buscar(loja, cliente_id))


@router.put("/{int:cliente_id}", response=ClienteOut)
def atualizar(request, cliente_id: int, payload: ClienteIn):
    loja = loja_com_papel(request, "gerente")
    c = _buscar(loja, cliente_id)
    _aplicar(c, payload)
    c.save()
    return services.detalhe(loja, c)


@router.post("/{int:cliente_id}/sair", response=ClienteOut)
def sair(request, cliente_id: int):
    """Cliente respondeu SAIR: revoga o consentimento na hora."""
    loja = loja_com_papel(request, "gerente")
    c = services.revogar_consentimento(
        loja=loja, usuario=request.user, cliente=_buscar(loja, cliente_id)
    )
    return services.detalhe(loja, c)
