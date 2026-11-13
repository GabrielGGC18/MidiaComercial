import pytest

from apps.acoes.models import EventoAuditoria


def test_auditoria_append_only(duas_lojas):
    ev = EventoAuditoria.objects.create(
        loja=duas_lojas["loja_a"], usuario=duas_lojas["user_a"], acao="teste", objeto="x"
    )
    ev.acao = "alterado"
    with pytest.raises(ValueError):
        ev.save()
    with pytest.raises(ValueError):
        ev.delete()
