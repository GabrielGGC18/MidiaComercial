"""Orquestra o pipeline da camada de inteligência (§4.1).

contexto → qualidade → regras → priorização → explicação → persistência

Garantias (docs/18):
- Execuções são fotografias imutáveis: recalcular cria outra e NÃO apaga a anterior.
- Mesma revisão dos dados + mesma versão do motor → devolve a análise vigente (idempotente).
- Cálculo e explicação (que pode chamar um LLM) rodam FORA da transação; a publicação é
  curta e serializada por loja (select_for_update na Loja). Requisições simultâneas com os
  mesmos dados publicam uma análise só.
- O LLM só reescreve texto: números, elegibilidade e prioridade são das regras.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.core.serializers.json import DjangoJSONEncoder
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.contas.models import Loja

from .coleta import montar_contexto
from .contexto import ContextoAnalise
from .explicacao.llm import explicador
from .models import Evidencia, ExecucaoMotor, Oportunidade, chave_de
from .priorizacao import priorizar
from .qualidade import indicadores
from .regras.a_lacuna_mix import RegraLacunaMix
from .regras.b_pouca_saida import RegraPoucaSaida
from .regras.c_padrao_publico import RegraPadraoPublico, RegraRecorrencia
from .revisao import VERSAO_MOTOR, fontes, revisao

REGRAS = [RegraLacunaMix(), RegraPoucaSaida(), RegraPadraoPublico(), RegraRecorrencia()]


def chave_alvo(regra: str, alvo: dict) -> str:
    return chave_de(regra, alvo)


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


@dataclass
class Resultado:
    execucao: ExecucaoMotor
    reaproveitada: bool  # True: nada mudou nos dados, devolvemos a análise vigente


def vigente(loja) -> ExecucaoMotor | None:
    return ExecucaoMotor.objects.da_loja(loja).order_by("-executado_em", "-id").first()


def _excluir(loja) -> frozenset:
    """Não repete alvo com plano aberto/recente, descarte recente ou adiamento ativo."""
    agora = timezone.now()
    recente = agora - timedelta(days=7)
    return frozenset(
        Oportunidade.objects.da_loja(loja)
        .filter(
            Q(plano__situacao="aberta")
            | Q(plano__criado_em__gte=recente)
            | Q(descartada_em__gte=recente)
            | Q(adiada_ate__gt=agora)
        )
        .values_list("chave", flat=True)
    )


def _frescor(op, ctx: ContextoAnalise) -> dict:
    if not any(e.fonte == "estoque" for e in op.evidencias) or ctx.idade_estoque_horas is None:
        return {}
    return {
        "horas": round(ctx.idade_estoque_horas, 1),
        "limite_horas": ctx.limiares.b_max_horas_estoque,
        "ok": ctx.estoque_atualizado,
    }


def _estruturar(op, ctx: ContextoAnalise) -> dict:
    """Campos da UX-07. Regra que não preencheu → deriva das evidências e da ação."""
    numeros = op.numeros or [
        {"rotulo": e.descricao, "valor": e.valor, "unidade": "registros", "amostra": e.amostra}
        for e in op.evidencias
    ]
    return {
        "resumo": op.resumo or (op.evidencias[0].descricao + "." if op.evidencias else ""),
        # valores como texto: uma política só para inteiro e decimal no JSON
        "numeros": [n | {"valor": str(n["valor"])} for n in numeros],
        "passos": op.passos or [op.acao_sugerida],
        "alternativas": op.alternativas,
        "frescor": _frescor(op, ctx),
    }


def _json(dados: dict) -> dict:
    """datetime → ISO para guardar no JSONField."""
    return json.loads(json.dumps(dados, cls=DjangoJSONEncoder))


def _por_revisao(loja, rev: str) -> ExecucaoMotor | None:
    return (
        ExecucaoMotor.objects.da_loja(loja)
        .filter(revisao_dados=rev, versao_motor=VERSAO_MOTOR)
        .first()
    )


def gerar(loja, fim: date | None = None) -> ExecucaoMotor:
    return calcular(loja, fim).execucao


def calcular(loja, fim: date | None = None) -> Resultado:
    t0 = time.monotonic()
    rev = revisao(loja, fim)
    atual = vigente(loja)
    if atual and atual.revisao_dados == rev and atual.versao_motor == VERSAO_MOTOR:
        return Resultado(atual, reaproveitada=True)

    # 1. Cálculo puro e explicação, sem transação aberta (o LLM pode demorar)
    ctx = montar_contexto(loja, fim)
    selecionadas, bloqueios, status_regras = avaliar(ctx, _excluir(loja))
    exp = explicador()
    cartoes = [
        (op, status, exp.explicar(op, status), _estruturar(op, ctx)) for op, status in selecionadas
    ]
    qualidade = indicadores(ctx) | {"regras": status_regras}
    versoes = {r.codigo: r.versao for r in REGRAS}
    retrato_fontes = _json(fontes(loja))

    # 2. Publicação curta e serializada por loja
    try:
        with transaction.atomic():
            Loja.objects.select_for_update().get(pk=loja.pk)
            existente = _por_revisao(loja, rev)
            if existente:  # outra requisição publicou os mesmos dados enquanto calculávamos
                return Resultado(existente, reaproveitada=True)
            anterior = vigente(loja)
            anteriores = set(
                Oportunidade.objects.da_loja(loja)
                .filter(
                    Q(execucao=anterior) | Q(plano__isnull=False) | Q(descartada_em__isnull=False)
                )
                .values_list("chave", flat=True)
            )
            execucao = ExecucaoMotor.objects.create(
                loja=loja,
                janela_inicio=ctx.janela_inicio,
                janela_fim=ctx.janela_fim,
                qualidade=qualidade,
                bloqueios=bloqueios,
                revisao_dados=rev,
                versao_motor=VERSAO_MOTOR,
                fontes=retrato_fontes,
            )
            for prioridade, (op, status, texto, estrutura) in enumerate(cartoes, start=1):
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
                    chave=chave_de(op.regra, op.alvo),
                    prioridade=prioridade,
                    explicacao=texto,
                    **estrutura,
                )
                Evidencia.objects.bulk_create(
                    [
                        Evidencia(
                            loja=loja,
                            oportunidade=o,
                            fonte=e.fonte,
                            descricao=e.descricao[:200],
                            valor=Decimal(e.valor),
                            periodo_inicio=e.periodo_inicio,
                            periodo_fim=e.periodo_fim,
                            amostra=e.amostra,
                        )
                        for e in op.evidencias
                    ]
                )
            execucao.duracao_ms = int((time.monotonic() - t0) * 1000)
            execucao.save(update_fields=["duracao_ms"])
            _publicar_eventos(loja, ctx, selecionadas, status_regras, anteriores)
    except IntegrityError:
        # sem trava de linha (ex.: SQLite) a outra requisição pode ter vencido a corrida
        existente = _por_revisao(loja, rev)
        if existente is None:
            raise
        return Resultado(existente, reaproveitada=True)
    return Resultado(execucao, reaproveitada=False)


def _publicar_eventos(loja, ctx, selecionadas, status_regras, anteriores) -> None:
    from apps.notificacoes.eventos import ESTOQUE_DESATUALIZADO, OPORTUNIDADE_NOVA, publicar

    nomes = {r.codigo: r.nome for r in REGRAS}
    for op, status in selecionadas:
        chave = chave_de(op.regra, op.alvo)
        if status == "suficiente" and chave not in anteriores:
            publicar(
                OPORTUNIDADE_NOVA, loja, chave=f"op:{chave}",
                titulo=op.titulo, regra_nome=nomes[op.regra],
            )  # fmt: skip
    b = status_regras.get("B_POUCA_SAIDA", {})
    if b.get("status") == "bloqueada" and ctx.estoque and not ctx.estoque_atualizado:
        publicar(ESTOQUE_DESATUALIZADO, loja, chave="estoque", horas=int(ctx.idade_estoque_horas))
