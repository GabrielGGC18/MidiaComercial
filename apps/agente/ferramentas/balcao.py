"""Ferramentas do balcão: achar variante e propor registro de demanda (com faixa etária)."""

from apps.comercio.models import Produto
from apps.core.faixas import FaixaEtaria
from apps.publico.services import buscar_catalogo

from ..models import PropostaAgente
from . import Contexto, ferramenta

MOTIVOS = {
    "indisponivel": "Sem estoque",
    "variacao_ausente": "Sem tamanho/cor",
    "preco": "Preço",
    "prazo": "Prazo",
    "outro": "Outro",
}


@ferramenta(
    "buscar_variante",
    "Busca produtos no catálogo da loja por texto (ex.: 'camiseta azul'). Retorna produtos com tamanhos e cores.",
    "atendente",
    {"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"]},
)
def buscar_variante(ctx: Contexto, texto: str) -> dict:
    produtos = buscar_catalogo(ctx.loja, texto, limite=5)
    return {"produtos": produtos}


@ferramenta(
    "propor_demanda",
    "Propõe registrar que um cliente procurou algo e não encontrou. Não grava: a pessoa confirma.",
    "atendente",
    {
        "type": "object",
        "properties": {
            "produto_id": {"type": ["integer", "null"]},
            "produto_texto": {"type": ["string", "null"]},
            "tamanho": {"type": ["string", "null"]},
            "cor": {"type": ["string", "null"]},
            "motivo": {"type": "string", "enum": list(MOTIVOS)},
            "faixa_etaria": {"type": ["string", "null"], "enum": [*FaixaEtaria.values, None]},
            "campos_incertos": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["motivo"],
    },
)
def propor_demanda(
    ctx: Contexto,
    motivo: str,
    produto_id: int | None = None,
    produto_texto: str | None = None,
    tamanho: str | None = None,
    cor: str | None = None,
    faixa_etaria: str | None = None,
    campos_incertos: list[str] | None = None,
) -> dict:
    incertos = list(campos_incertos or [])
    produto = (
        Produto.objects.da_loja(ctx.loja).filter(pk=produto_id).first() if produto_id else None
    )
    if produto_id and produto is None:
        produto_id, incertos = None, [*incertos, "produto"]
    if motivo not in MOTIVOS:
        motivo, incertos = "outro", [*incertos, "motivo"]
    nome = produto.nome if produto else (produto_texto or "item não identificado")
    rotulo = " ".join(x for x in [nome, cor, tamanho] if x)
    dados = {
        "produto_id": produto.id if produto else None,
        "produto_texto": None if produto else (produto_texto or None),
        "categoria": produto.categoria if produto else None,
        "tamanho": tamanho,
        "cor": cor,
        "motivo": motivo,
        "faixa_etaria": faixa_etaria,
    }
    p = PropostaAgente.objects.create(
        loja=ctx.loja,
        sessao=ctx.sessao,
        tipo=PropostaAgente.Tipo.DEMANDA,
        resumo=f"Procurou {rotulo} · {MOTIVOS[motivo].lower()}",
        dados=dados,
        campos_incertos=sorted(set(incertos)),
        motivos=["Interpretado da frase do atendente"],
        limitacao="Confira produto, tamanho e motivo antes de confirmar.",
        criado_por=ctx.usuario,
    )
    ctx.propostas.append(p)
    return {"proposta_id": p.id, "resumo": p.resumo, "campos_incertos": p.campos_incertos}
