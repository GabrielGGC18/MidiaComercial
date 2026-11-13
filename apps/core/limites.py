"""Limites de requisição (rate limit) com o throttling nativo do Django Ninja.

Cada limite tem ESCOPO próprio: o Ninja guarda o contador no cache com a chave
`throttle_<escopo>_<ident>`. Usar a mesma classe em duas rotas somaria os contadores.

Taxas em settings (`MIDIA_LIMITE_*`), no formato do Ninja: "10/m", "100/h".
Em produção o cache é compartilhado (DatabaseCache): com 3 workers do gunicorn, cache em
memória contaria 3 vezes o limite.

IP atrás de proxy: o Ninja usa X-Forwarded-For conforme NINJA_NUM_PROXIES (prod.py).
O XFF pode ser forjado por quem chama a API direto; por isso o login tem também um
limite POR USUÁRIO digitado, que não depende de IP.
"""

from __future__ import annotations

import hashlib
import json

from django.conf import settings
from ninja.throttling import AnonRateThrottle, UserRateThrottle


class _TaxaDasSettings:
    """Relê a taxa das settings a cada requisição (o Ninja leria só uma vez, no import).
    Assim a taxa muda por ambiente e os testes usam override_settings."""

    setting: str = ""

    def __init__(self):
        super().__init__(getattr(settings, self.setting))

    def allow_request(self, request) -> bool:
        self.rate = getattr(settings, self.setting)
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request)


class LimiteLoginIp(_TaxaDasSettings, AnonRateThrottle):
    scope = "login_ip"
    setting = "MIDIA_LIMITE_LOGIN_IP"


class LimiteLoginUsuario(_TaxaDasSettings, AnonRateThrottle):
    """Conta tentativas por nome de usuário (normalizado), venha de qualquer IP."""

    scope = "login_usuario"
    setting = "MIDIA_LIMITE_LOGIN_USUARIO"

    def get_cache_key(self, request):
        try:
            usuario = str(json.loads(request.body or b"{}").get("username", "")).strip().lower()
        except (ValueError, AttributeError):
            usuario = ""
        if not usuario:
            return None  # sem usuário o schema rejeita; o limite por IP já cobre
        ident = hashlib.sha256(usuario.encode()).hexdigest()[:32]
        return self.cache_format % {"scope": self.scope, "ident": ident}


class LimiteAgente(_TaxaDasSettings, UserRateThrottle):
    """Mensagens ao agente: cada uma pode chamar um LLM (custo e CPU)."""

    scope = "agente"
    setting = "MIDIA_LIMITE_AGENTE"


class LimiteImportacao(_TaxaDasSettings, UserRateThrottle):
    """Prévia de importação: processa CSV/XLSX de até alguns MB a cada chamada."""

    scope = "importacao"
    setting = "MIDIA_LIMITE_IMPORTACAO"
