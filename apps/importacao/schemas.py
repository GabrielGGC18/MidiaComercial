"""Contrato do CSV de vendas (§5.3).

Uma linha por item de pedido. Separador `;`, UTF-8.
A loja NUNCA vem do arquivo; vem da sessão.
"""

import re
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from apps.core.faixas import normalizar_faixa

SEPARADOR = ";"
COLUNAS_OBRIGATORIAS = (
    "pedido_id",
    "item_id",
    "data_hora",
    "sku",
    "categoria",
    "quantidade",
    "receita_item",
    "status",
)
COLUNAS_OPCIONAIS = ("cliente_ref", "custo_total_item", "canal", "variante", "faixa_etaria")

# cliente_ref deve ser opaco: rejeita o que parece CPF, telefone ou e-mail
_PARECE_DADO_PESSOAL = re.compile(
    r"^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$"  # CPF
    r"|^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$"  # telefone BR
    r"|@"  # e-mail
)


class LinhaVendaCSV(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    pedido_id: str = Field(min_length=1, max_length=60)
    item_id: str = Field(min_length=1, max_length=30)
    data_hora: datetime
    sku: str = Field(min_length=1, max_length=60)
    categoria: str = Field(min_length=1, max_length=80)
    quantidade: int = Field(gt=0)
    receita_item: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    status: Literal["concluida", "cancelada"]
    cliente_ref: str | None = Field(default=None, max_length=64)
    custo_total_item: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)
    canal: str | None = Field(default=None, max_length=30)
    variante: str | None = Field(default=None, max_length=60)
    faixa_etaria: str | None = None

    @field_validator("receita_item", "custo_total_item", mode="before")
    @classmethod
    def aceita_virgula_decimal(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
            # "1.234,56" → "1234.56"; "119,80" → "119.80"
            if "," in v:
                v = v.replace(".", "").replace(",", ".")
        return v

    @field_validator("data_hora")
    @classmethod
    def exige_fuso(cls, v: datetime):
        if v.tzinfo is None:
            raise ValueError("data_hora precisa de fuso (ex.: 2026-11-01T10:30:00-03:00)")
        return v

    @field_validator("status", mode="before")
    @classmethod
    def normaliza_status(cls, v):
        if isinstance(v, str):
            return v.strip().lower().replace("í", "i")
        return v

    @field_validator("cliente_ref", "custo_total_item", "canal", "variante", mode="before")
    @classmethod
    def vazio_vira_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("faixa_etaria", mode="before")
    @classmethod
    def valida_faixa(cls, v):
        return normalizar_faixa(v)

    @field_validator("cliente_ref")
    @classmethod
    def cliente_ref_opaco(cls, v):
        if v and _PARECE_DADO_PESSOAL.search(v):
            raise ValueError("cliente_ref parece dado pessoal; use um código opaco")
        return v


# ── Contrato do CSV de estoque ────────────────────────────────────────────────
COLUNAS_ESTOQUE = ("sku", "saldo", "capturado_em")


class LinhaEstoqueCSV(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="ignore")

    sku: str = Field(min_length=1, max_length=60)
    saldo: int
    capturado_em: datetime

    @field_validator("capturado_em")
    @classmethod
    def exige_fuso(cls, v: datetime):
        if v.tzinfo is None:
            raise ValueError("capturado_em precisa de fuso (ex.: 2026-11-12T18:00:00-03:00)")
        return v
