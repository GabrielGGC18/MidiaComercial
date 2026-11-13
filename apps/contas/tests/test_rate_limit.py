import pytest
from django.core.cache import cache
from django.test import override_settings

from apps.core.demo import SENHA_DEMO  # senha pública da demo (não é segredo)

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _cache_limpo():
    cache.clear()
    yield
    cache.clear()


def _csrf(client) -> str:
    client.get("/api/csrf")
    return client.cookies["csrftoken"].value


def _login(client, token, usuario="x", senha="y", ip="10.0.0.1", **extra):
    return client.post(
        "/api/auth/login",
        {"username": usuario, "password": senha},
        content_type="application/json",
        HTTP_X_CSRFTOKEN=token,
        REMOTE_ADDR=ip,
        **extra,
    )


@pytest.fixture
def gerente(django_user_model):
    from apps.contas.models import Loja, Vinculo

    loja = Loja.objects.create(nome="Loja Limite")
    user = django_user_model.objects.create_user("limite", password=SENHA_DEMO)
    Vinculo.objects.create(user=user, loja=loja, papel="gerente")
    return user


@override_settings(MIDIA_LOGIN_MAX_FALHAS=3)
def test_falhas_bloqueiam_so_o_mesmo_ip(client, gerente):
    token = _csrf(client)
    for _ in range(3):
        assert _login(client, token, "limite", "errada", ip="10.0.0.9").status_code == 401
    r = _login(client, token, "limite", SENHA_DEMO, ip="10.0.0.9")
    assert r.status_code == 429  # bloqueado mesmo com a senha certa, nesse IP
    assert r.json()["detail"].startswith("Muitas tentativas")
    # quem ataca de outro IP não tranca o dono da conta
    assert _login(client, token, "limite", SENHA_DEMO, ip="10.0.0.1").status_code == 200


@override_settings(MIDIA_LOGIN_MAX_FALHAS=3)
def test_acerto_zera_as_falhas(client, gerente):
    token = _csrf(client)
    for _ in range(2):
        _login(client, token, "limite", "errada")
    assert _login(client, token, "limite", SENHA_DEMO).status_code == 200
    token = _csrf(client)
    for _ in range(2):  # contador recomeçou: 2 falhas ainda não bloqueiam
        assert _login(client, token, "limite", "errada").status_code == 401
    assert _login(client, token, "limite", SENHA_DEMO).status_code == 200


@override_settings(MIDIA_LIMITE_LOGIN_IP="2/m")
def test_login_limita_por_ip_e_ignora_xff_forjado(client):
    token = _csrf(client)
    assert _login(client, token, "a", HTTP_X_FORWARDED_FOR="1.1.1.1").status_code != 429
    assert _login(client, token, "b", HTTP_X_FORWARDED_FOR="2.2.2.2").status_code != 429
    r = _login(client, token, "c", HTTP_X_FORWARDED_FOR="3.3.3.3")
    assert r.status_code == 429  # trocar o X-Forwarded-For não escapa do limite
    assert "Retry-After" in r


@override_settings(MIDIA_LIMITE_LOGIN_IP="1/m", MIDIA_PROXY_SEGREDO="s3gr3d0-de-teste")
def test_ip_do_proxy_so_vale_com_o_segredo(client):
    token = _csrf(client)
    via = {"HTTP_X_MIDIA_PROXY": "s3gr3d0-de-teste"}
    # mesmo IP de conexão (a Vercel), clientes diferentes: cada um tem seu limite
    assert _login(client, token, HTTP_X_MIDIA_CLIENTE_IP="7.7.7.7", **via).status_code != 429
    assert _login(client, token, HTTP_X_MIDIA_CLIENTE_IP="8.8.8.8", **via).status_code != 429
    assert _login(client, token, HTTP_X_MIDIA_CLIENTE_IP="7.7.7.7", **via).status_code == 429
    # segredo errado: o IP repassado é ignorado e conta o IP da conexão
    falso = {"HTTP_X_MIDIA_PROXY": "chute", "HTTP_X_MIDIA_CLIENTE_IP": "9.9.9.9"}
    assert _login(client, token, ip="10.5.5.5", **falso).status_code != 429
    assert _login(client, token, ip="10.5.5.5", **falso).status_code == 429


@override_settings(MIDIA_LIMITE_AGENTE="2/m")
def test_agente_tem_limite_proprio(client, gerente):
    """O limite do agente não soma com o de login nem com o de importação."""
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
