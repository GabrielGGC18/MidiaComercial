from datetime import datetime
from typing import Literal

from django.utils import timezone
from ninja import Field, Router, Schema
from ninja.errors import HttpError

from apps.core.faixas import FaixaEtaria
from apps.core.limites import LimiteAgente
from apps.core.permissoes import loja_com_papel, tem_papel

from . import orquestrador, prospeccao, services
from .ferramentas import Contexto, disponiveis
from .models import Campanha, PropostaAgente, SessaoAgente

router = Router(tags=["Agente"])


class ClienteResumo(Schema):
    id: int
    nome: str
    ref: str
    faixa_rotulo: str
    tamanhos: list[str]
    whatsapp_final: str


class PropostaOut(Schema):
    id: int
    tipo: str
    status: str
    resumo: str
    dados: dict
    campos_incertos: list[str]
    motivos: list[str]
    limitacao: str
    pontuacao: int
    campanha_id: int | None
    cliente: ClienteResumo | None
    criado_em: datetime
    decidido_em: datetime | None
    enviado_em: datetime | None
    objeto_criado: str
    # o que a tela deve recarregar depois da confirmação (em vez de somar +1 por conta)
    atualizar: list[str] = []


class MensagemIn(Schema):
    texto: str = Field(..., min_length=2, max_length=500)
    canal: Literal["texto", "voz"] = "texto"
    sessao_id: int | None = Field(None, description="Continua a conversa (memória curta)")


class MensagemOut(Schema):
    sessao_id: int
    provedor: str
    resposta: str
    propostas: list[PropostaOut]
    passos: list[str] = []  # o que o agente fez, em palavras de loja


class ConversaResumo(Schema):
    id: int
    titulo: str
    turnos: int
    atualizado_em: datetime
    provedor: str


class FalaOut(Schema):
    papel: Literal["voce", "agente"]
    texto: str
    em: datetime | None = None
    passos: list[str] = []
    propostas: list[PropostaOut] = []


class ConversaOut(Schema):
    id: int
    falas: list[FalaOut]


class ConfirmarIn(Schema):
    ajustes: dict = {}


class CampanhaOut(Schema):
    id: int
    titulo: str
    gatilho: str
    alvo: dict
    motivo: str
    status: str
    criado_em: datetime
    medicao: dict
    propostas: list[PropostaOut]


class UsoOut(Schema):
    dias: int
    sessoes: int
    mensagens: int
    com_llm: int
    caiu_no_offline: int
    tokens_entrada: int
    tokens_saida: int
    tempo_medio_ms: int
    modelo: str


class FerramentaOut(Schema):
    nome: str
    descricao: str
    papel_minimo: str


_ATUALIZAR = {
    "demanda": ["demandas", "oportunidades", "qualidade", "notificacoes"],
    "cliente": ["clientes"],
}


def _p_out(p: PropostaAgente, ver_pessoal: bool) -> dict:
    c = p.cliente
    dados = dict(p.dados)
    if p.tipo == "cliente" and not ver_pessoal:
        dados["whatsapp"] = "•••" if dados.get("whatsapp") else ""
    if dados.get("faixa_etaria") in FaixaEtaria.values:
        dados["faixa_rotulo"] = FaixaEtaria(dados["faixa_etaria"]).label
    return {
        "id": p.id,
        "tipo": p.tipo,
        "status": p.status,
        "resumo": p.resumo,
        "dados": dados,
        "campos_incertos": p.campos_incertos,
        "motivos": p.motivos,
        "limitacao": p.limitacao,
        "pontuacao": p.pontuacao,
        "campanha_id": p.campanha_id,
        "cliente": (
            {
                "id": c.id,
                "nome": c.nome,
                "ref": c.ref,
                "faixa_rotulo": c.get_faixa_etaria_display() if c.faixa_etaria else "",
                "tamanhos": c.tamanhos,
                "whatsapp_final": c.whatsapp[-4:] if c.whatsapp else "",
            }
            if c and ver_pessoal
            else None
        ),
        "criado_em": p.criado_em,
        "decidido_em": p.decidido_em,
        "enviado_em": p.enviado_em,
        "objeto_criado": p.objeto_criado,
        "atualizar": _ATUALIZAR.get(p.objeto_criado.split(":")[0], []) if p.objeto_criado else [],
    }


def _buscar(request, proposta_id: int) -> PropostaAgente:
    loja = loja_com_papel(request, "atendente")
    p = (
        PropostaAgente.objects.da_loja(loja)
        .select_related("cliente", "campanha")
        .filter(pk=proposta_id)
        .first()
    )
    if p is None:
        raise HttpError(404, "Proposta não encontrada.")
    if p.tipo != "demanda" and not tem_papel(request, "gerente"):
        raise HttpError(404, "Proposta não encontrada.")
    return p


@router.get("/ferramentas", response=list[FerramentaOut])
def ferramentas(request):
    loja_com_papel(request, "atendente")
    return [
        {"nome": f.nome, "descricao": f.descricao, "papel_minimo": f.papel_minimo}
        for f in disponiveis(request.papel)
    ]


@router.post("/mensagens", response=MensagemOut, throttle=[LimiteAgente()])
def mensagem(request, payload: MensagemIn):
    loja = loja_com_papel(request, "atendente")
    try:
        r = orquestrador.processar(
            loja=loja, usuario=request.user, papel=request.papel, texto=payload.texto,
            canal=payload.canal, sessao_id=payload.sessao_id,
        )  # fmt: skip
    except orquestrador.SessaoInvalida as exc:
        raise HttpError(404, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        from .ferramentas import FerramentaNegada

        if isinstance(exc, FerramentaNegada):
            raise HttpError(403, str(exc)) from exc
        raise
    ver = tem_papel(request, "gerente")
    return r | {"propostas": [_p_out(p, ver) for p in r["propostas"]]}


def _modelo_configurado(settings) -> str:
    if not settings.MIDIA_IA_HABILITADA:
        return "offline"
    return {
        "claude": settings.MIDIA_IA_MODELO,
        "hermes": "hermes:midiacomercial",  # GPT pelo OAuth do Hermes (não informa tokens)
    }.get(settings.MIDIA_IA_PROVEDOR, "offline")


@router.get("/uso", response=UsoOut)
def uso(request, dias: int = 30):
    """Quanto o agente foi usado e quanto custou em tokens (para o dono decidir se liga o LLM)."""
    from datetime import timedelta

    from django.conf import settings
    from django.db.models import Avg, Count, Q, Sum
    from django.utils import timezone

    loja = loja_com_papel(request, "gerente")
    dias = max(1, min(dias, 90))
    qs = SessaoAgente.objects.da_loja(loja).filter(
        criado_em__gte=timezone.now() - timedelta(days=dias), turnos__gt=0
    )
    a = qs.aggregate(
        sessoes=Count("id"), mensagens=Sum("turnos"),
        com_llm=Count("id", filter=~Q(provedor="offline")),  # claude ou hermes
        caiu=Count("id", filter=~Q(fallback="")),
        te=Sum("tokens_entrada"), ts=Sum("tokens_saida"), tm=Avg("duracao_ms"),
    )  # fmt: skip
    return {
        "dias": dias,
        "sessoes": a["sessoes"],
        "mensagens": a["mensagens"] or 0,
        "com_llm": a["com_llm"],
        "caiu_no_offline": a["caiu"],
        "tokens_entrada": a["te"] or 0,
        "tokens_saida": a["ts"] or 0,
        "tempo_medio_ms": int(a["tm"] or 0),
        "modelo": _modelo_configurado(settings),
    }


@router.get("/propostas", response=list[PropostaOut])
def propostas(request, status: str = "pendente", tipo: str | None = None):
    loja = loja_com_papel(request, "atendente")
    qs = PropostaAgente.objects.da_loja(loja).select_related("cliente").filter(status=status)
    if not tem_papel(request, "gerente"):
        qs = qs.filter(tipo="demanda", criado_por=request.user)
    if tipo:
        qs = qs.filter(tipo=tipo)
    return [_p_out(p, tem_papel(request, "gerente")) for p in qs[:100]]


@router.post("/propostas/{int:proposta_id}/confirmar", response=PropostaOut)
def confirmar(request, proposta_id: int, payload: ConfirmarIn):
    p = _buscar(request, proposta_id)
    try:
        p = services.confirmar(
            loja=request.loja,
            usuario=request.user,
            papel=request.papel,
            proposta=p,
            ajustes=payload.ajustes,
        )
    except services.PropostaErro as exc:
        raise HttpError(409, str(exc)) from exc
    except Exception as exc:  # validação do mesmo schema do formulário
        from pydantic import ValidationError

        if isinstance(exc, ValidationError):
            raise HttpError(422, "Dados da proposta inválidos: " + exc.errors()[0]["msg"]) from exc
        raise
    return _p_out(p, tem_papel(request, "gerente"))


@router.post("/propostas/{int:proposta_id}/rejeitar", response=PropostaOut)
def rejeitar(request, proposta_id: int):
    p = _buscar(request, proposta_id)
    try:
        p = services.rejeitar(loja=request.loja, usuario=request.user, proposta=p)
    except services.PropostaErro as exc:
        raise HttpError(409, str(exc)) from exc
    return _p_out(p, tem_papel(request, "gerente"))


@router.post("/propostas/{int:proposta_id}/enviada", response=PropostaOut)
def enviada(request, proposta_id: int):
    loja_com_papel(request, "gerente")
    p = _buscar(request, proposta_id)
    try:
        p = services.marcar_enviada(loja=request.loja, usuario=request.user, proposta=p)
    except services.PropostaErro as exc:
        raise HttpError(409, str(exc)) from exc
    return _p_out(p, True)


def _camp_out(c: Campanha) -> dict:
    return {
        "id": c.id,
        "titulo": c.titulo,
        "gatilho": c.gatilho,
        "alvo": c.alvo,
        "motivo": c.motivo,
        "status": c.status,
        "criado_em": c.criado_em,
        "medicao": prospeccao.medir(c),
        "propostas": [_p_out(p, True) for p in c.propostas.select_related("cliente")],
    }


@router.post("/prospeccao", response=list[CampanhaOut])
def rodar_prospeccao(request):
    loja = loja_com_papel(request, "gerente")
    sessao = SessaoAgente.objects.create(loja=loja, usuario=request.user, provedor="offline")
    ctx = Contexto(loja=loja, usuario=request.user, papel=request.papel, sessao=sessao)
    return [_camp_out(c) for c in prospeccao.rodar(ctx)]


@router.get("/campanhas", response=list[CampanhaOut])
def campanhas(request):
    loja = loja_com_papel(request, "gerente")
    return [_camp_out(c) for c in Campanha.objects.da_loja(loja).exclude(status="encerrada")[:20]]


@router.post("/campanhas/{int:campanha_id}/encerrar", response=CampanhaOut)
def encerrar(request, campanha_id: int):
    loja = loja_com_papel(request, "gerente")
    c = Campanha.objects.da_loja(loja).filter(pk=campanha_id).first()
    if c is None:
        raise HttpError(404, "Campanha não encontrada.")
    c.status = Campanha.Status.ENCERRADA
    c.save(update_fields=["status"])
    c.propostas.filter(status="pendente").update(status="rejeitada")
    return _camp_out(c)


# ── conversas (P2-01): histórico do chat, só da própria pessoa nesta loja ─────


def _titulo(s: SessaoAgente) -> str:
    for m in s.historico:
        if m.get("role") == "user" and isinstance(m.get("content"), str):
            t = m["content"].strip()
            return t[:60] + ("…" if len(t) > 60 else "")
    return "Conversa"


def _minha_sessao(request, sessao_id: int) -> SessaoAgente:
    loja = loja_com_papel(request, "atendente")
    s = SessaoAgente.objects.da_loja(loja).filter(pk=sessao_id, usuario=request.user).first()
    if s is None:  # de outra pessoa ou de outra loja: não existe para quem pediu
        raise HttpError(404, "Conversa não encontrada.")
    return s


@router.get("/conversas", response=list[ConversaResumo])
def conversas(request):
    loja = loja_com_papel(request, "atendente")
    qs = (
        SessaoAgente.objects.da_loja(loja)
        .filter(usuario=request.user, turnos__gt=0)
        .exclude(historico=[])
        .order_by("-atualizado_em")[:30]
    )
    return [
        {
            "id": s.id,
            "titulo": _titulo(s),
            "turnos": s.turnos,
            "atualizado_em": s.atualizado_em,
            "provedor": s.provedor,
        }
        for s in qs
    ]


@router.get("/conversas/{int:sessao_id}", response=ConversaOut)
def conversa(request, sessao_id: int):
    from .orquestrador import ROTULO_PASSO

    s = _minha_sessao(request, sessao_id)
    ids = {i for m in s.historico for i in m.get("propostas", [])}
    ver = tem_papel(request, "gerente")
    props = {
        p.id: _p_out(p, ver)
        for p in PropostaAgente.objects.da_loja(s.loja).filter(id__in=ids).select_related("cliente")
    }
    falas = [
        {
            "papel": "voce" if m.get("role") == "user" else "agente",
            "texto": m.get("content") or "",
            "em": m.get("em"),
            "passos": [ROTULO_PASSO.get(n, n) for n in m.get("passos", [])],
            # proposta apagada no fallback simplesmente não aparece
            "propostas": [props[i] for i in m.get("propostas", []) if i in props],
        }
        for m in s.historico
        if isinstance(m.get("content"), str)
    ]
    return {"id": s.id, "falas": falas}


@router.delete("/conversas/{int:sessao_id}", response={204: None})
def apagar_conversa(request, sessao_id: int):
    """Apaga o texto (LGPD / "Limpar conversa"). Auditoria e propostas confirmadas ficam:
    são registros da loja. Pendentes dessa conversa viram rejeitadas."""
    s = _minha_sessao(request, sessao_id)
    s.historico = []
    s.save(update_fields=["historico"])
    PropostaAgente.objects.da_loja(s.loja).filter(
        sessao=s, status=PropostaAgente.Status.PENDENTE
    ).update(status=PropostaAgente.Status.REJEITADA, decidido_em=timezone.now())
    return 204, None
