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
- Sem o segredo (chamada direta à API), vale o `X-Real-IP` que o nginx do host SOBRESCREVE
  com o IP da conexão; sem nginx (dev), o REMOTE_ADDR.

Login: além do limite por IP (todas as tentativas), há um limite de FALHAS por
usuário + IP. Só senha errada conta e o login certo zera. Assim ninguém tranca uma conta
(ex.: a demo pública) errando a senha de propósito de outro IP.
"""

from __future__ import annotations

import hashlib
import hmac

from django.conf import settings
from django.core.cache import cache
from ninja.throttling import AnonRateThrottle, UserRateThrottle


def ip_cliente(request) -> str:
    segredo = getattr(settings, "MIDIA_PROXY_SEGREDO", "")
    if segredo:
        enviado = request.headers.get("X-Midia-Proxy", "")
        if enviado and hmac.compare_digest(enviado, segredo):
            ip = request.headers.get("X-Midia-Cliente-Ip", "").strip()
            if ip:
                return ip[:64]
    return (request.headers.get("X-Real-IP") or request.META.get("REMOTE_ADDR") or "")[:64]


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


def _chave_falhas(usuario: str, request) -> str:
    base = f"{usuario.strip().lower()}|{ip_cliente(request)}"
    return "login_falhas_" + hashlib.sha256(base.encode()).hexdigest()[:32]


def login_bloqueado(usuario: str, request) -> bool:
    return cache.get(_chave_falhas(usuario, request), 0) >= settings.MIDIA_LOGIN_MAX_FALHAS


def registrar_falha_login(usuario: str, request) -> None:
    chave = _chave_falhas(usuario, request)
    # janela fixa: conta a partir da 1ª falha e expira sozinha
    if not cache.add(chave, 1, timeout=settings.MIDIA_LOGIN_JANELA_FALHAS):
        try:
            cache.incr(chave)
        except ValueError:  # expirou entre o add e o incr
            cache.set(chave, 1, timeout=settings.MIDIA_LOGIN_JANELA_FALHAS)


def limpar_falhas_login(usuario: str, request) -> None:
    cache.delete(_chave_falhas(usuario, request))
