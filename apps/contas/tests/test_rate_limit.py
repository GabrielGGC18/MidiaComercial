import pytest
from django.core.cache import cache
from django.test import override_settings

pytestmark = pytest.mark.django_db


def _csrf(client) -> str:
    client.get("/api/csrf")
    return client.cookies["csrftoken"].value


def _login(client, token, usuario="x", senha="y", ip="10.0.0.1"):
    return client.post(
        "/api/auth/login",
        {"username": usuario, "password": senha},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
        REMOTE_ADDR=ip,
    )


@override_settings(MIDIA_LIMITE_LOGIN_USUARIO="3/m", MIDIA_LIMITE_LOGIN_IP="1000/m")
def test_login_limita_por_usuario_mesmo_trocando_ip(client):
    cache.clear()
    token = _csrf(client)
    for i in range(3):
        assert _login(client, token, ip=f"10.0.0.{i}").status_code != 429
    r = _login(client, token, ip="10.9.9.9")  # IP novo não zera o contador do usuário
    assert r.status_code == 429
    assert r.json()["detail"].startswith("Muitas tentativas")
    assert "Retry-After" in r


@override_settings(MIDIA_LIMITE_LOGIN_USUARIO="1000/m", MIDIA_LIMITE_LOGIN_IP="2/m")
def test_login_limita_por_ip(client):
    cache.clear()
    token = _csrf(client)
    assert _login(client, token, usuario="a").status_code != 429
    assert _login(client, token, usuario="b").status_code != 429
    assert _login(client, token, usuario="c").status_code == 429
    assert _login(client, token, usuario="d", ip="10.0.0.2").status_code != 429


@override_settings(MIDIA_LIMITE_AGENTE="2/m")
def test_agente_tem_limite_proprio(client, django_user_model):
    """O limite do agente não soma com o de login nem com o de importação."""
    from apps.contas.models import Loja, Vinculo
    from apps.core.demo import SENHA_DEMO  # senha pública da demo (não é segredo)

    cache.clear()
    loja = Loja.objects.create(nome="Loja Limite")
    user = django_user_model.objects.create_user("limite", password=SENHA_DEMO)
    Vinculo.objects.create(user=user, loja=loja, papel="gerente")
    token = _csrf(client)
    assert _login(client, token, "limite", SENHA_DEMO).status_code == 200
    token = client.cookies["csrftoken"].value

    def falar():
        return client.post(
            "/api/agente/mensagens",
            {"texto": "bom dia"},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

    assert falar().status_code != 429
    assert falar().status_code != 429
    assert falar().status_code == 429
