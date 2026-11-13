"""Limites de requisição (rate limit) com o throttling nativo do Django Ninja.

Cada limite tem ESCOPO próprio: o Ninja guarda o contador no cache com a chave
`throttle_<escopo>_<ident>`. Usar a mesma classe em duas rotas somaria os contadores.

Taxas em settings (`MIDIA_LIMITE_*`), no formato do Ninja: "10/m", "100/h".
Em produção o cache é compartilhado (DatabaseCache): com 3 workers do gunicorn, cache em
memória contaria 3 vezes o limite.

IP do cliente (`ip_cliente`): NUNCA vem do X-Forwarded-For, que o cliente pode forjar.
- Requisição que veio pelo middleware da Vercel traz `X-Midia-Proxy` com o segredo
  compartilhado (MIDIA_PROXY_SEGREDO) e `X-Midia-Cliente-Ip` com o IP que a Vercel viu.
  Só nesse caso o IP repassado é aceito.
- Sem o segredo, o `X-Real-IP` só vale se a CONEXÃO vier de um proxy confiável
  (MIDIA_PROXIES_CONFIAVEIS: nginx do host ou Caddy da rede Docker, que sobrescrevem o
  cabeçalho). Conexão de qualquer outra origem: REMOTE_ADDR, sem olhar cabeçalho.

Login (só senha errada conta; o acerto zera):
- por usuário + IP: ninguém tranca a conta de outra pessoa errando de outro IP;
- por conta, somando todos os IPs (limite mais alto), contra força bruta distribuída.
  Não vale para as contas da demo: a senha delas é pública (força bruta não faz
  sentido) e bloqueá-las só serviria para tirar a banca da demo.
"""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from ninja.throttling import AnonRateThrottle, UserRateThrottle


@lru_cache(maxsize=8)
def _redes(texto: str) -> tuple:
    faixas = (r.strip() for r in texto.split(","))
    return tuple(ipaddress.ip_network(r, strict=False) for r in faixas if r)


def _de_proxy_confiavel(remoto: str) -> bool:
    try:
        ip = ipaddress.ip_address(remoto)
    except ValueError:
        return False
    return any(ip in rede for rede in _redes(settings.MIDIA_PROXIES_CONFIAVEIS))


def ip_cliente(request) -> str:
    remoto = request.META.get("REMOTE_ADDR") or ""
    segredo = getattr(settings, "MIDIA_PROXY_SEGREDO", "")
    if segredo:
        enviado = request.headers.get("X-Midia-Proxy", "")
        if enviado and hmac.compare_digest(enviado, segredo):
            ip = request.headers.get("X-Midia-Cliente-Ip", "").strip()
            if ip:
                return ip[:64]
    real = request.headers.get("X-Real-IP", "").strip()
    if real and _de_proxy_confiavel(remoto):
        return real[:64]
    return remoto[:64]


class _TaxaDasSettings:
    """Relê a taxa das settings a cada requisição (o Ninja leria só uma vez, no import)
    e identifica o cliente por `ip_cliente` (nunca pelo X-Forwarded-For)."""

    setting: str = ""

    def __init__(self):
        super().__init__(getattr(settings, self.setting))

    def allow_request(self, request) -> bool:
        self.rate = getattr(settings, self.setting)
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request)

    def get_ident(self, request) -> str:
        return ip_cliente(request)


class LimiteLoginIp(_TaxaDasSettings, AnonRateThrottle):
    """Todas as tentativas de login de um IP (com ou sem acerto)."""

    scope = "login_ip"
    setting = "MIDIA_LIMITE_LOGIN_IP"


class LimiteAgente(_TaxaDasSettings, UserRateThrottle):
    """Mensagens ao agente: cada uma pode chamar um LLM (custo e CPU)."""

    scope = "agente"
    setting = "MIDIA_LIMITE_AGENTE"


class LimiteImportacao(_TaxaDasSettings, UserRateThrottle):
    """Prévia de importação: processa CSV/XLSX de até alguns MB a cada chamada."""

    scope = "importacao"
    setting = "MIDIA_LIMITE_IMPORTACAO"


# ── falhas de login por usuário + IP ─────────────────────────────────────────


def _hash(texto: str) -> str:
    return hashlib.sha256(texto.encode()).hexdigest()[:32]


def _chave_falhas(usuario: str, request) -> str:
    return "login_falhas_" + _hash(f"{usuario.strip().lower()}|{ip_cliente(request)}")


def _chave_falhas_conta(usuario: str) -> str:
    return "login_falhas_conta_" + _hash(usuario.strip().lower())


def _conta_demo(usuario: str) -> bool:
    from apps.core.demo import USUARIOS_DEMO

    return usuario.strip().lower() in {u.lower() for u in USUARIOS_DEMO}


def login_bloqueado(usuario: str, request) -> bool:
    if cache.get(_chave_falhas(usuario, request), 0) >= settings.MIDIA_LOGIN_MAX_FALHAS:
        return True
    if _conta_demo(usuario):
        return False
    return cache.get(_chave_falhas_conta(usuario), 0) >= settings.MIDIA_LOGIN_MAX_FALHAS_CONTA


def _incrementar(chave: str, janela: int) -> None:
    # janela fixa: conta a partir da 1ª falha e expira sozinha
    if not cache.add(chave, 1, timeout=janela):
        try:
            cache.incr(chave)
        except ValueError:  # expirou entre o add e o incr
            cache.set(chave, 1, timeout=janela)


def registrar_falha_login(usuario: str, request) -> None:
    _incrementar(_chave_falhas(usuario, request), settings.MIDIA_LOGIN_JANELA_FALHAS)
    if not _conta_demo(usuario):
        _incrementar(_chave_falhas_conta(usuario), settings.MIDIA_LOGIN_JANELA_CONTA)


def limpar_falhas_login(usuario: str, request) -> None:
    cache.delete_many([_chave_falhas(usuario, request), _chave_falhas_conta(usuario)])
