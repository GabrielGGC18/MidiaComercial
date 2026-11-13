from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from django.utils import timezone
from ninja import Field, Router, Schema, Status
from ninja.errors import HttpError
from pydantic import field_validator

from apps.comercio.models import Produto
from apps.core.faixas import normalizar_faixa
from apps.core.permissoes import loja_com_papel

from . import services
from .models import DemandaNaoAtendida

analises_router = Router(tags=["Meu público"])
catalogo_router = Router(tags=["Catálogo"])
demandas_router = Router(tags=["Demandas"])

Motivo = Literal["indisponivel", "variacao_ausente", "preco", "prazo", "outro"]


# ── Meu público ───────────────────────────────────────────────────────────────
class KpisOut(Schema):
    receita: Decimal
    devolucoes: Decimal
    pedidos: int
    ticket_medio: Decimal
    itens: int


class CoberturaOut(Schema):
    percentual: Decimal
    identificados: int
    total: int


class CategoriaOut(Schema):
    categoria: str
    receita: Decimal
    unidades: int
    pedidos: int
    participacao_receita: Decimal


class CelulaHeatmap(Schema):
    dia: int = Field(description="0 = segunda … 6 = domingo")
    hora: int
    pedidos: int


class PontoSerie(Schema):
    data: date
    receita: Decimal


class RecorrenciaOut(Schema):
    status: Literal["suficiente", "amostra_limitada", "bloqueada"]
    motivo: str | None
    clientes_identificados: int
    compra_unica_pct: Decimal | None
    recorrentes_pct: Decimal | None


class PeriodoTop(Schema):
    periodo: str
    dia: int
    faixa: int
    receita: Decimal
    pedidos: int
    participacao: Decimal


class PeriodoCategoria(Schema):
    categoria: str
    melhor_periodo: str
    dia: int
    faixa: int
    participacao: Decimal
    unidades: int
    amostra_limitada: bool


class PeriodosOut(Schema):
    top: list[PeriodoTop]
    por_categoria: list[PeriodoCategoria]
    turnos: list[dict]
    fases_mes: list[dict]
    limitacao: str


class FaixaOut(Schema):
    faixa: str
    rotulo: str
    pedidos: int
    receita: Decimal
    participacao: Decimal
    ticket_medio: Decimal
    categoria_preferida: str | None
    procuras_nao_atendidas: int


class FaixasOut(Schema):
    faixas: list[FaixaOut]
    cobertura: dict
    principal: str | None
    status: Literal["suficiente", "amostra_limitada", "bloqueada"]
    limitacao: str


class PublicoOut(Schema):
    inicio: date
    fim: date
    kpis: KpisOut
    cobertura: CoberturaOut
    categorias: list[CategoriaOut]
    heatmap: list[CelulaHeatmap]
    serie_diaria: list[PontoSerie]
    recorrencia: RecorrenciaOut
    periodos: PeriodosOut
    faixas: FaixasOut


@analises_router.get("/publico", response=PublicoOut)
def publico(request, inicio: date | None = None, fim: date | None = None):
    loja = loja_com_papel(request, "gerente")
    inicio, fim = services.janela_padrao(loja, inicio, fim)
    return services.perfil_publico(loja, inicio, fim)


# ── Catálogo (autocomplete do balcão) ─────────────────────────────────────────
class VarianteOut(Schema):
    sku: str
    tamanho: str
    cor: str


class ProdutoOut(Schema):
    id: int
    nome: str
    categoria: str
    tamanhos: list[str]
    cores: list[str]
    variantes: list[VarianteOut]


@catalogo_router.get("/", response=list[ProdutoOut])
def catalogo(request, q: str = ""):
    loja = loja_com_papel(request, "atendente")
    return services.buscar_catalogo(loja, q.strip()[:60])


# ── Demandas ──────────────────────────────────────────────────────────────────
class DemandaIn(Schema):
    produto_id: int | None = None
    produto_texto: str | None = Field(None, max_length=160)
    categoria: str | None = Field(None, max_length=80)
    tamanho: str | None = Field(None, max_length=10)
    cor: str | None = Field(None, max_length=40)
    motivo: Motivo
    qtd_procurada: int | None = Field(None, ge=1, le=99)
    faixa_etaria: str | None = None

    @field_validator("faixa_etaria", mode="before")
    @classmethod
    def _faixa(cls, v):
        return normalizar_faixa(v)


class DemandaOut(Schema):
    id: int
    rotulo: str
    sku: str | None
    motivo: str
    motivo_rotulo: str
    registrado_em: datetime
    no_catalogo: bool
    faixa_etaria: str


def _demanda_out(d: DemandaNaoAtendida) -> dict:
    rotulo, sku = services.rotulo_demanda(d)
    return {
        "id": d.id,
        "rotulo": rotulo,
        "sku": sku,
        "motivo": d.motivo,
        "motivo_rotulo": d.get_motivo_display(),
        "registrado_em": d.registrado_em,
        "no_catalogo": bool(d.variante_id),
        "faixa_etaria": d.faixa_etaria,
    }


@demandas_router.post("/", response={201: DemandaOut})
def registrar(request, payload: DemandaIn):
    loja = loja_com_papel(request, "atendente")
    if not payload.produto_id and not (payload.produto_texto or "").strip():
        raise HttpError(422, "Diga o que o cliente procurou.")
    try:
        d = services.registrar_demanda(loja=loja, usuario=request.user, dados=payload)
    except Produto.DoesNotExist as exc:
        raise HttpError(404, "Produto não encontrado.") from exc
    return Status(201, _demanda_out(d))


@demandas_router.get("/recentes", response=list[DemandaOut])
def recentes(request, minhas: bool = True):
    loja = loja_com_papel(request, "atendente")
    usuario = request.user if minhas else None
    return [_demanda_out(d) for d in services.ultimas_demandas(loja, usuario)]


@demandas_router.delete("/{int:demanda_id}", response={204: None})
def desfazer(request, demanda_id: int):
    """Desfaz registro feito por engano (só o próprio autor, até 10 min)."""
    loja = loja_com_papel(request, "atendente")
    d = DemandaNaoAtendida.objects.da_loja(loja).filter(pk=demanda_id).first()
    if d is None:
        raise HttpError(404, "Registro não encontrado.")
    if d.registrado_por_id != request.user.id:
        raise HttpError(403, "Só quem registrou pode desfazer.")
    if (timezone.now() - d.registrado_em).total_seconds() > 600:
        raise HttpError(409, "Passou do prazo de 10 minutos para desfazer.")
    d.delete()
    return Status(204, None)


class ItemRankingOut(Schema):
    chave: str
    rotulo: str
    sku: str | None
    categoria: str
    total: int
    por_motivo: dict[str, int]
    saldo: int | None
    no_catalogo: bool


class RankingOut(Schema):
    inicio: date
    fim: date
    total: int
    por_motivo: dict[str, int]
    itens: list[ItemRankingOut]


@demandas_router.get("/ranking", response=RankingOut)
def ranking(
    request, inicio: date | None = None, fim: date | None = None, motivo: Motivo | None = None
):
    loja = loja_com_papel(request, "gerente")
    inicio, fim = services.janela_padrao(loja, inicio, fim)
    return services.ranking_demanda(loja, inicio, fim, motivo)
