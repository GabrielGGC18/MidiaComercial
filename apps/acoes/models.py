from django.conf import settings
from django.db import models

from apps.core.models import ModeloDaLoja


class PlanoAcao(ModeloDaLoja):
    class Situacao(models.TextChoices):
        ABERTA = "aberta", "Aberta"
        CONCLUIDA = "concluida", "Concluída"
        DESCARTADA = "descartada", "Descartada"

    oportunidade = models.OneToOneField(
        "inteligencia.Oportunidade",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plano",
    )
    titulo = models.CharField(max_length=200)
    responsavel = models.CharField(max_length=80)
    prazo = models.DateField()
    indicador = models.CharField(max_length=200)
    situacao = models.CharField(max_length=12, choices=Situacao.choices, default=Situacao.ABERTA)
    justificativa = models.TextField(blank=True)

    def __str__(self):
        return self.titulo


class Medicao(ModeloDaLoja):
    plano = models.ForeignKey(PlanoAcao, on_delete=models.CASCADE, related_name="medicoes")
    periodo_antes_inicio = models.DateField()
    periodo_antes_fim = models.DateField()
    periodo_depois_inicio = models.DateField()
    periodo_depois_fim = models.DateField()
    valor_antes = models.DecimalField(max_digits=14, decimal_places=2)
    valor_depois = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    contexto = models.TextField(blank=True)
    versao_calculo = models.CharField(max_length=10, default="1.0")

    def __str__(self):
        return f"Medição do plano {self.plano_id}"


class EventoAuditoria(ModeloDaLoja):
    """Append-only: não pode ser alterado nem apagado pela aplicação."""

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    acao = models.CharField(max_length=60)
    objeto = models.CharField(max_length=120)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.acao} · {self.objeto}"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError("EventoAuditoria é append-only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("EventoAuditoria é append-only")
