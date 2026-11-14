"""Contrato das regras do motor (§4.2).

Regras recebem um ContextoAnalise já filtrado pela loja e NÃO fazem query livre.
Não importam views, request nem ORM.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Literal, Protocol

if TYPE_CHECKING:
    from apps.inteligencia.contexto import ContextoAnalise

StatusRegra = Literal["suficiente", "amostra_limitada", "bloqueada"]
Fonte = Literal["vendas", "demanda", "estoque", "acao"]


@dataclass(frozen=True)
class EvidenciaCandidata:
    fonte: Fonte
    descricao: str  # "9 registros de procura não atendida"
    valor: Decimal | int
    periodo_inicio: date
    periodo_fim: date
    amostra: int  # quantos registros sustentam o número


@dataclass
class OportunidadeCandidata:
    regra: str  # "A_LACUNA_MIX"
    titulo: str
    acao_sugerida: str
    limitacao: str
    alvo: dict  # {"sku": "CAM-AZ-M"} ou {"categoria": "Cintos"}
    urgencia: int  # 1..3
    esforco: int  # 1..3
    evidencias: list[EvidenciaCandidata] = field(default_factory=list)
    medicao_sugerida: str = ""
    # Campos estruturados (UX-07). Vazios → o motor deriva das evidências e da ação.
    resumo: str = ""  # 1 frase com o porquê, em linguagem de loja
    numeros: list[dict] = field(default_factory=list)  # [{"rotulo", "valor", "unidade"}]
    passos: list[str] = field(default_factory=list)  # checklist curto do que fazer
    alternativas: list[dict] = field(default_factory=list)  # o que oferecer hoje (saldo fresco)


@dataclass
class ResultadoRegra:
    status: StatusRegra
    oportunidades: list[OportunidadeCandidata]
    motivo: str | None = None  # explica bloqueio ou amostra limitada
    como_liberar: str | None = None  # o que o lojista faz para destravar a regra


class Regra(Protocol):
    codigo: str
    nome: str  # "Lacuna de mix"
    versao: str
    campos_necessarios: set[str]  # ex.: {"demanda", "estoque_atualizado"}

    def avaliar(self, ctx: ContextoAnalise) -> ResultadoRegra: ...
