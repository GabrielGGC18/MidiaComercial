from decimal import Decimal

import pytest
from pydantic import ValidationError

from apps.importacao.schemas import LinhaVendaCSV

BASE = {
    "pedido_id": "V001",
    "item_id": "1",
    "data_hora": "2026-11-01T10:30:00-03:00",
    "sku": "CAM-AZ-M",
    "categoria": "Camisetas",
    "quantidade": "2",
    "receita_item": "119,80",
    "status": "concluida",
    "cliente_ref": "",
}


def test_linha_valida():
    linha = LinhaVendaCSV(**BASE)
    assert linha.receita_item == Decimal("119.80")
    assert linha.cliente_ref is None


def test_milhar_com_ponto():
    assert LinhaVendaCSV(**{**BASE, "receita_item": "1.234,56"}).receita_item == Decimal("1234.56")


@pytest.mark.parametrize(
    "campo,valor",
    [
        ("quantidade", "0"),
        ("status", "pendente"),
        ("data_hora", "2026-11-01T10:30:00"),  # sem fuso
        ("receita_item", "-1"),
        ("cliente_ref", "123.456.789-09"),  # CPF
        ("cliente_ref", "(63) 99999-1234"),  # telefone
        ("cliente_ref", "fulano@email.com"),
    ],
)
def test_linha_invalida(campo, valor):
    with pytest.raises(ValidationError):
        LinhaVendaCSV(**{**BASE, campo: valor})


def test_cliente_ref_opaco_ok():
    assert LinhaVendaCSV(**{**BASE, "cliente_ref": "C-8f3a"}).cliente_ref == "C-8f3a"
