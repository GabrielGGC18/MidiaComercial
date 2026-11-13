"""MidiaComercial: settings comuns.

Django serve apenas /api/* (Django Ninja) e /admin/. O frontend é a SPA React em frontend/.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
    MIDIA_IA_HABILITADA=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # domínio
    "apps.core",
    "apps.contas",
    "apps.importacao",
    "apps.comercio",
    "apps.estoque",
    "apps.publico",
    "apps.inteligencia",
    "apps.acoes",
    "apps.clientes",
    "apps.agente",
    "apps.notificacoes",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.core.middleware.LojaAtualMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Araguaina"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Upload de CSV limitado (§6.1)
UPLOAD_MAX_BYTES = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = UPLOAD_MAX_BYTES + 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = UPLOAD_MAX_BYTES

# SPA no mesmo domínio: cookie csrftoken legível pelo JS, sessão HttpOnly
CSRF_COOKIE_HTTPONLY = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# IA opcional (§9): desligada por padrão; demo funciona sem internet
MIDIA_IA_HABILITADA = env("MIDIA_IA_HABILITADA")
MIDIA_IA_PROVEDOR = env("MIDIA_IA_PROVEDOR", default="offline")  # offline | claude | hermes
MIDIA_IA_API_KEY = env("MIDIA_IA_API_KEY", default="")
# modelo rápido e barato basta: o agente só escolhe ferramenta e preenche campos
MIDIA_IA_MODELO = env("MIDIA_IA_MODELO", default="claude-haiku-4-5")
MIDIA_IA_TIMEOUT = env.float("MIDIA_IA_TIMEOUT", default=20.0)
MIDIA_IA_MAX_TOKENS = env.int("MIDIA_IA_MAX_TOKENS", default=1024)
MIDIA_AGENTE_MAX_PASSOS = 6
MIDIA_AGENTE_HISTORICO = 6  # últimas falas (mascaradas) reenviadas ao LLM na mesma sessão

# Hermes (GPT via OAuth na VPS): o container fala com a ponte do host por socket unix.
# As credenciais ficam no perfil do Hermes; aqui não há chave nenhuma. Ver deploy/hermes/.
MIDIA_HERMES_SOCKET = env(
    "MIDIA_HERMES_SOCKET", default="/var/lib/midiacomercial-hermes/ponte.sock"
)
MIDIA_HERMES_TIMEOUT = env.float("MIDIA_HERMES_TIMEOUT", default=40.0)
MIDIA_HERMES_MAX_RODADAS = env.int("MIDIA_HERMES_MAX_RODADAS", default=3)

# Rate limit (apps/core/limites.py). Formato do Ninja: "10/m", "200/h".
# Login por IP é folgado: numa apresentação, a banca inteira sai pelo mesmo IP do wifi.
MIDIA_LIMITE_LOGIN_IP = env("MIDIA_LIMITE_LOGIN_IP", default="30/m")
# Falhas de senha por usuário + IP (só erro conta; acerto zera): evita trancar a demo pública
MIDIA_LOGIN_MAX_FALHAS = env.int("MIDIA_LOGIN_MAX_FALHAS", default=10)
MIDIA_LOGIN_JANELA_FALHAS = env.int("MIDIA_LOGIN_JANELA_FALHAS", default=300)  # segundos
# Por conta, somando todos os IPs (força bruta distribuída). Não vale para contas da demo.
MIDIA_LOGIN_MAX_FALHAS_CONTA = env.int("MIDIA_LOGIN_MAX_FALHAS_CONTA", default=30)
MIDIA_LOGIN_JANELA_CONTA = env.int("MIDIA_LOGIN_JANELA_CONTA", default=900)  # segundos
# Conexões de onde o X-Real-IP é confiável (proxy que SOBRESCREVE o cabeçalho): loopback
# e redes Docker. De qualquer outra origem, vale o IP da conexão.
MIDIA_PROXIES_CONFIAVEIS = env(
    "MIDIA_PROXIES_CONFIAVEIS", default="127.0.0.1/32,::1/128,172.16.0.0/12"
)
# Segredo compartilhado com o middleware da Vercel (API_SEGREDO lá). Só com ele o IP do
# cliente repassado pela Vercel é aceito; vazio = nunca confiar em IP repassado.
MIDIA_PROXY_SEGREDO = env("MIDIA_PROXY_SEGREDO", default="")
MIDIA_LIMITE_AGENTE = env("MIDIA_LIMITE_AGENTE", default="20/m")
MIDIA_LIMITE_IMPORTACAO = env("MIDIA_LIMITE_IMPORTACAO", default="10/m")

# Notificações (padrão Observer): na tela sempre; e-mail opcional
NOTIFICACOES_EMAIL = env.bool("NOTIFICACOES_EMAIL", default=False)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="MidiaComercial <nao-responda@localhost>")
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
