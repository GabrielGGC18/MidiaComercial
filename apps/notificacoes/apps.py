from django.apps import AppConfig


class NotificacoesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notificacoes"
    label = "notificacoes"

    def ready(self):
        from . import observadores  # noqa: F401  (registra os observers)
