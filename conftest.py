import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from apps.contas.models import Loja, Vinculo


@pytest.fixture
def duas_lojas(db):
    """Loja A e loja B, cada uma com seu gerente (cenário do teste obrigatório §8.1)."""
    User = get_user_model()
    loja_a = Loja.objects.create(nome="Loja A", demo=True)
    loja_b = Loja.objects.create(nome="Loja B", demo=True)
    user_a = User.objects.create_user("gerente_a", password="x")
    user_b = User.objects.create_user("gerente_b", password="x")
    Vinculo.objects.create(user=user_a, loja=loja_a, papel="gerente")
    Vinculo.objects.create(user=user_b, loja=loja_b, papel="gerente")
    return {"loja_a": loja_a, "loja_b": loja_b, "user_a": user_a, "user_b": user_b}


def api_login(client: Client, username: str, password: str = "x"):
    """Fluxo real da SPA: GET /api/csrf → POST /api/auth/login com X-CSRFToken."""
    client.get("/api/csrf")
    token = client.cookies["csrftoken"].value
    r = client.post(
        "/api/auth/login",
        {"username": username, "password": password},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
    )
    client.defaults["HTTP_X_CSRFTOKEN"] = client.cookies["csrftoken"].value
    return r


@pytest.fixture
def cliente_a(duas_lojas):
    c = Client(enforce_csrf_checks=True)
    api_login(c, "gerente_a")
    return c
