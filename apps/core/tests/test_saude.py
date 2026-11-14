"""P1-03: saúde pública, 200 com banco e 503 sem vazar detalhe."""

from unittest import mock

import pytest
from django.db.utils import OperationalError
from django.test import Client

pytestmark = pytest.mark.django_db


def test_saude_ok():
    r = Client().get("/api/saude")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_saude_sem_banco_503_sem_detalhe():
    with mock.patch("apps.core.api.connection.cursor", side_effect=OperationalError("senha xyz")):
        r = Client().get("/api/saude")
    assert r.status_code == 503 and r.json() == {"status": "indisponivel"}
    assert "xyz" not in r.content.decode()
