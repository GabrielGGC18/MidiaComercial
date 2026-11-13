from django.conf import settings
from django.db import models

from apps.core.faixas import FaixaEtaria
from apps.core.models import ModeloDaLoja


class DemandaNaoAtendida(ModeloDaLoja):
    """Cliente procurou e não encontrou. Sem dados pessoais (§8.3)."""

    class Motivo(models.TextChoices):
        INDISPONIVEL = "indisponivel", "Sem estoque"
        VARIACAO_AUSENTE = "variacao_ausente", "Sem tamanho/cor"
        PRECO = "preco", "Preço"
        PRAZO = "prazo", "Prazo"
        OUTRO = "outro", "Outro"

    variante = models.ForeignKey(
        "comercio.Variante",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="demandas",
    )
    produto_texto = models.CharField(
        max_length=160, blank=True, help_text="Quando o item não existe no catálogo"
    )
    categoria = models.CharField(max_length=80, blank=True)
    tamanho = models.CharField(max_length=10, blank=True)
    cor = models.CharField(max_length=40, blank=True)
    motivo = models.CharField(max_length=20, choices=Motivo.choices)
    qtd_procurada = models.PositiveSmallIntegerField(null=True, blank=True)
    faixa_etaria = models.CharField(
        max_length=8,
        choices=FaixaEtaria.choices,
        blank=True,
        help_text="Estimada; nunca data de nascimento",
    )
    registrado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    registrado_em = models.DateTimeField(db_index=True)

    class Meta:
        indexes = [models.Index(fields=["loja", "registrado_em"])]
        constraints = [
            models.CheckConstraint(
                condition=~(models.Q(variante__isnull=True) & models.Q(produto_texto="")),
                name="demanda_tem_variante_ou_texto",
            )
        ]

    def __str__(self):
        return f"Demanda {self.pk} ({self.motivo})"
