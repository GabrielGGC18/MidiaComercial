"""ContextoAnalise: fotografia imutável dos dados de UMA loja numa janela (§4.1, passo 1).

Estruturas simples (sem ORM) para as regras serem puras e testáveis sem banco.
A montagem a partir do banco fica em coleta.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal


@dataclass(frozen=True)
class VendaItem:
    pedido_id: int
    data_hora: datetime  # já no fuso local
    sku: str
    categoria: str
    quantidade: int
    receita: Decimal
    cliente_ref: str | None


@dataclass(frozen=True)
class RegistroDemanda:
    registrado_em: datetime
    sku: str | None
    rotulo: str  # "Camiseta básica Azul M" (ou texto livre)
    categoria: str
    tamanho: str
    cor: str
    motivo: str


@dataclass(frozen=True)
class SaldoEstoque:
    sku: str
    saldo: int
    capturado_em: datetime


@dataclass(frozen=True)
class InfoSku:
    nome: str  # "Camiseta básica Azul M"
    categoria: str
    produto: str = ""  # id do produto-pai: variantes irmãs (outra cor/tamanho)


@dataclass(frozen=True)
class Limiares:
    a_min_demandas: int = 5
    b_dias_sem_venda: int = 21
    b_max_horas_estoque: int = 72
    c_limiar_concentracao: Decimal = Decimal("0.25")
    c_min_cobertura_cliente: Decimal = Decimal("0.30")


@dataclass(frozen=True)
class ContextoAnalise:
    loja_id: int
    janela_inicio: date
    janela_fim: date
    agora: datetime
    limiares: Limiares
    vendas: tuple[VendaItem, ...] = ()
    demandas: tuple[RegistroDemanda, ...] = ()
    estoque: tuple[SaldoEstoque, ...] = ()
    catalogo: dict[str, InfoSku] = field(default_factory=dict)
    ultima_venda: dict[str, datetime] = field(default_factory=dict)  # todo o histórico
    inicio_historico: datetime | None = None

    @property
    def idade_estoque_horas(self) -> float | None:
        if not self.estoque:
            return None
        return (self.agora - max(s.capturado_em for s in self.estoque)).total_seconds() / 3600

    @property
    def estoque_atualizado(self) -> bool:
        idade = self.idade_estoque_horas
        return idade is not None and idade <= self.limiares.b_max_horas_estoque

    @property
    def pedidos_ids(self) -> set[int]:
        return {v.pedido_id for v in self.vendas}

    @property
    def cobertura_cliente(self) -> Decimal:
        pedidos = {}
        for v in self.vendas:
            pedidos[v.pedido_id] = v.cliente_ref
        if not pedidos:
            return Decimal("0")
        com_ref = sum(1 for ref in pedidos.values() if ref)
        return Decimal(com_ref) / Decimal(len(pedidos))

    @property
    def campos_disponiveis(self) -> set[str]:
        campos = set()
        if self.vendas:
            campos.add("vendas")
        if self.demandas:
            campos.add("demanda")
        if self.estoque:
            campos.add("estoque")
            if self.estoque_atualizado:
                campos.add("estoque_atualizado")
        if self.cobertura_cliente >= self.limiares.c_min_cobertura_cliente:
            campos.add("cliente_ref")
        return campos

    def saldo(self, sku: str) -> SaldoEstoque | None:
        for s in self.estoque:
            if s.sku == sku:
                return s
        return None
