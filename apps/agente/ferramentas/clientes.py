"""Ferramentas da base de clientes. Ao LLM só voltam dados sem nome/telefone."""

from apps.clientes import services as clientes_services
from apps.core.faixas import FaixaEtaria

from ..models import PropostaAgente
from . import Contexto, ferramenta


@ferramenta(
    "propor_cliente",
    "Propõe cadastrar/atualizar um cliente na base (nome, WhatsApp, faixa etária, tamanhos, interesses, consentimento). Não grava.",
    "gerente",
    {
        "type": "object",
        "properties": {
            "nome": {"type": ["string", "null"]},
            "whatsapp": {
                "type": ["string", "null"],
                "description": "Pode vir mascarado, ex.: [TELEFONE_1]",
            },
            "faixa_etaria": {"type": ["string", "null"], "enum": [*FaixaEtaria.values, None]},
            "tamanhos": {"type": "array", "items": {"type": "string"}},
            "categorias_interesse": {"type": "array", "items": {"type": "string"}},
            "consentimento_contato": {"type": ["boolean", "null"]},
            "campos_incertos": {"type": "array", "items": {"type": "string"}},
        },
    },
)
def propor_cliente(
    ctx: Contexto,
    nome: str | None = None,
    whatsapp: str | None = None,
    faixa_etaria: str | None = None,
    tamanhos: list[str] | None = None,
    categorias_interesse: list[str] | None = None,
    consentimento_contato: bool | None = None,
    campos_incertos: list[str] | None = None,
) -> dict:
    incertos = list(campos_incertos or [])
    if consentimento_contato is None:
        consentimento_contato, incertos = False, [*incertos, "consentimento_contato"]
    try:
        zap = clientes_services.normalizar_whatsapp(whatsapp)
    except ValueError:
        zap, incertos = "", [*incertos, "whatsapp"]
    dados = {
        "nome": (nome or "").strip(),
        "whatsapp": zap,
        "faixa_etaria": faixa_etaria,
        "tamanhos": tamanhos or [],
        "categorias_interesse": categorias_interesse or [],
        "consentimento_contato": bool(consentimento_contato),
    }
    if not dados["nome"]:
        incertos.append("nome")
    p = PropostaAgente.objects.create(
        loja=ctx.loja,
        sessao=ctx.sessao,
        tipo=PropostaAgente.Tipo.CLIENTE,
        resumo=f"Cadastrar cliente {dados['nome'] or '(sem nome)'}",
        dados=dados,
        campos_incertos=sorted(set(incertos)),
        motivos=["Interpretado da frase"],
        limitacao="Só marque consentimento se o cliente autorizou receber mensagens.",
        criado_por=ctx.usuario,
    )
    ctx.propostas.append(p)
    return {"proposta_id": p.id, "campos_incertos": p.campos_incertos}


@ferramenta(
    "buscar_clientes",
    "Busca clientes pelos campos preenchidos. Retorna códigos e perfil, sem nome ou telefone.",
    "gerente",
    {
        "type": "object",
        "properties": {
            "faixa_etaria": {"type": ["string", "null"]},
            "categoria": {"type": ["string", "null"]},
            "tamanho": {"type": ["string", "null"]},
            "so_consentidos": {"type": "boolean"},
        },
    },
)
def buscar_clientes(
    ctx: Contexto, faixa_etaria=None, categoria=None, tamanho=None, so_consentidos=False
) -> dict:
    achados = clientes_services.buscar(
        ctx.loja, faixa=faixa_etaria or "", categoria=categoria or "", tamanho=tamanho or "",
        consentimento=True if so_consentidos else None, limite=50,
    )  # fmt: skip
    return {
        "total": len(achados),
        "clientes": [
            {
                "ref": c["ref"],
                "faixa": c["faixa_rotulo"],
                "tamanhos": c["tamanhos"],
                "pedidos": c["pedidos"],
            }
            for c in achados[:20]
        ],
    }


@ferramenta(
    "prospectar_produtos_em_baixa",
    "Encontra produtos em baixa (estoque parado ou queda de vendas) e propõe contatos com clientes consentidos que têm interesse provável. Não envia nada.",
    "gerente",
    {
        "type": "object",
        "properties": {
            "termo": {
                "type": ["string", "null"],
                "description": "Filtra produto/categoria (opcional)",
            }
        },
    },
)
def prospectar(ctx: Contexto, termo: str | None = None) -> dict:
    from ..prospeccao import rodar

    campanhas = rodar(ctx, termo=termo)
    return {
        "campanhas": [
            {"id": c.id, "titulo": c.titulo, "contatos": c.propostas.count()} for c in campanhas
        ]
    }
