from django.conf import settings
from django.db import models

from apps.core.models import ModeloDaLoja


class LoteImportacao(ModeloDaLoja):
    class Tipo(models.TextChoices):
        VENDAS = "vendas", "Vendas"
        ESTOQUE = "estoque", "Estoque"

    class Status(models.TextChoices):
        PREVIA = "previa", "Prévia"
        CONFIRMADO = "confirmado", "Confirmado"
        CANCELADO = "cancelado", "Cancelado"
        FALHOU = "falhou", "Falhou"

    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    arquivo_hash = models.CharField(max_length=64, help_text="SHA-256 do arquivo")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PREVIA)
    linhas_ok = models.PositiveIntegerField(default=0)
    linhas_rejeitadas = models.PositiveIntegerField(default=0)
    linhas_duplicadas = models.PositiveIntegerField(default=0)
    total_importado = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_origem_informado = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    confirmado_em = models.DateTimeField(null=True, blank=True)
    nome_arquivo = models.CharField(max_length=200, blank=True)
    # linhas válidas aguardando confirmação; esvaziado ao confirmar/cancelar (§8.3)
    linhas_pendentes = models.JSONField(default=list, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["loja", "tipo", "arquivo_hash"], name="lote_unico_por_arquivo"
            )
        ]

    @property
    def diferenca_reconciliacao(self):
        if self.total_origem_informado is None:
            return None
        return self.total_origem_informado - self.total_importado

    def __str__(self):
        return f"Lote {self.pk} ({self.tipo}, {self.status})"


class LinhaRejeitada(models.Model):
    """Erro por linha. Não guarda conteúdo bruto do CSV (§8.3)."""

    lote = models.ForeignKey(LoteImportacao, on_delete=models.CASCADE, related_name="rejeitadas")
    numero_linha = models.PositiveIntegerField()
    erros = models.JSONField(help_text='[{"campo": "quantidade", "mensagem": "deve ser > 0"}]')

    class Meta:
        ordering = ["numero_linha"]

    def __str__(self):
        return f"Lote {self.lote_id}, linha {self.numero_linha}"
