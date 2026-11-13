from django.conf import settings
from django.db import models

from apps.core.models import ModeloDaLoja


class Notificacao(ModeloDaLoja):
    """Aviso para a EQUIPE da loja (nunca para o cliente). Sem dado pessoal no texto."""

    class Nivel(models.TextChoices):
        INFO = "info", "Informação"
        ATENCAO = "atencao", "Atenção"
        SUCESSO = "sucesso", "Boa notícia"
        ERRO = "erro", "Problema"

    tipo = models.CharField(max_length=40)
    nivel = models.CharField(max_length=10, choices=Nivel.choices, default=Nivel.INFO)
    titulo = models.CharField(max_length=140)
    texto = models.CharField(max_length=300)
    link = models.CharField(max_length=120, blank=True, help_text="Rota da SPA, ex.: /agente")
    papel_minimo = models.CharField(max_length=12, default="gerente")
    chave = models.CharField(max_length=120, help_text="Agrupa repetições do mesmo evento")
    contador = models.PositiveIntegerField(default=1)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-atualizada_em"]
        indexes = [models.Index(fields=["loja", "chave", "atualizada_em"])]

    def __str__(self):
        return self.titulo


class Leitura(models.Model):
    """Estado de leitura por usuário (cada pessoa marca a sua)."""

    notificacao = models.ForeignKey(Notificacao, on_delete=models.CASCADE, related_name="leituras")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+"
    )
    lida_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["notificacao", "usuario"], name="leitura_unica")
        ]

    def __str__(self):
        return f"{self.usuario_id} leu {self.notificacao_id}"
