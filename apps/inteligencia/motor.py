"""Orquestra o pipeline da camada de inteligência (§4.1).

contexto → qualidade → regras → priorização → explicação → persistência
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .coleta import montar_contexto
from .contexto import ContextoAnalise
from .explicacao.llm import explicador
from .models import Evidencia, ExecucaoMotor, Oportunidade
from .priorizacao import priorizar
from .qualidade import indicadores
from .regras.a_lacuna_mix import RegraLacunaMix
from .regras.b_pouca_saida import RegraPoucaSaida
from .regras.c_padrao_publico import RegraPadraoPublico, RegraRecorrencia

REGRAS = [RegraLacunaMix(), RegraPoucaSaida(), RegraPadraoPublico(), RegraRecorrencia()]


def chave_alvo(regra: str, alvo: dict) -> tuple:
    return (
        regra,
        alvo.get("sku") or alvo.get("rotulo") or alvo.get("categoria") or alvo.get("metrica"),
    )


def avaliar(ctx: ContextoAnalise, excluir: frozenset = frozenset()):
    """Parte pura do motor (sem banco): devolve (selecionadas, bloqueios, status_por_regra)."""
    candidatas, bloqueios, status_regras = [], [], {}
    for regra in REGRAS:
        r = regra.avaliar(ctx)
        status_regras[regra.codigo] = {
            "nome": regra.nome,
            "versao": regra.versao,
            "status": r.status,
            "motivo": r.motivo,
            "oportunidades": len(r.oportunidades),
        }
        if r.status == "bloqueada":
            bloqueios.append(
                {
                    "regra": regra.codigo,
                    "nome": regra.nome,
                    "motivo": r.motivo,
                    "como_liberar": r.como_liberar,
                }
            )
            continue
        candidatas.extend(
            (op, r.status) for op in r.oportunidades if chave_alvo(op.regra, op.alvo) not in excluir
        )
    return priorizar(candidatas), bloqueios, status_regras


@transaction.atomic
def gerar(loja, fim: date | None = None) -> ExecucaoMotor:
    ctx = montar_contexto(loja, fim)
    # não repete alvo com plano aberto/recente nem descartado nos últimos 7 dias
    recente = timezone.now() - timedelta(days=7)
    excluir = frozenset(
        chave_alvo(o.regra, o.alvo)
        for o in Oportunidade.objects.da_loja(loja).filter(
            Q(plano__situacao="aberta")
            | Q(plano__criado_em__gte=recente)
            | Q(descartada_em__gte=recente)
        )
    )
    selecionadas, bloqueios, status_regras = avaliar(ctx, excluir)

    anteriores = {chave_alvo(o.regra, o.alvo) for o in Oportunidade.objects.da_loja(loja)}
    # nova execução substitui cartões abertos sem plano da execução anterior
    Oportunidade.objects.da_loja(loja).filter(
        plano__isnull=True, descartada_em__isnull=True
    ).delete()

    qualidade = indicadores(ctx) | {"regras": status_regras}
    execucao = ExecucaoMotor.objects.create(
        loja=loja,
        janela_inicio=ctx.janela_inicio,
        janela_fim=ctx.janela_fim,
        qualidade=qualidade,
        bloqueios=bloqueios,
    )
    versoes = {r.codigo: r.versao for r in REGRAS}
    exp = explicador()
    for prioridade, (op, status) in enumerate(selecionadas, start=1):
        o = Oportunidade.objects.create(
            loja=loja,
            execucao=execucao,
            regra=op.regra,
            versao_regra=versoes[op.regra],
            status=status,
            titulo=op.titulo[:200],
            acao_sugerida=op.acao_sugerida,
            limitacao=op.limitacao,
            medicao_sugerida=op.medicao_sugerida,
            alvo=op.alvo,
            prioridade=prioridade,
            explicacao=exp.explicar(op, status),
        )
        for e in op.evidencias:
            Evidencia.objects.create(
                loja=loja,
                oportunidade=o,
                fonte=e.fonte,
                descricao=e.descricao[:200],
                valor=Decimal(e.valor),
                periodo_inicio=e.periodo_inicio,
                periodo_fim=e.periodo_fim,
                amostra=e.amostra,
            )
    _publicar_eventos(loja, ctx, selecionadas, status_regras, anteriores)
    return execucao


def _publicar_eventos(loja, ctx, selecionadas, status_regras, anteriores) -> None:
    from apps.notificacoes.eventos import ESTOQUE_DESATUALIZADO, OPORTUNIDADE_NOVA, publicar

    nomes = {r.codigo: r.nome for r in REGRAS}
    for op, status in selecionadas:
        chave = chave_alvo(op.regra, op.alvo)
        if status == "suficiente" and chave not in anteriores:
            publicar(
                OPORTUNIDADE_NOVA, loja, chave=f"op:{chave[0]}:{chave[1]}",
                titulo=op.titulo, regra_nome=nomes[op.regra],
            )  # fmt: skip
    b = status_regras.get("B_POUCA_SAIDA", {})
    if b.get("status") == "bloqueada" and ctx.estoque and not ctx.estoque_atualizado:
        publicar(ESTOQUE_DESATUALIZADO, loja, chave="estoque", horas=int(ctx.idade_estoque_horas))
