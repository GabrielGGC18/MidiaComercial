"""Base de clientes: o ÚNICO lugar com dado pessoal (nome, WhatsApp), sempre com consentimento.

O núcleo analítico continua usando só `Pedido.cliente_ref` (opaco). A ligação é pelo `ref`.
"""

from django.db import models

from apps.core.faixas import FaixaEtaria
from apps.core.models import ModeloDaLoja


class Cliente(ModeloDaLoja):
    class Origem(models.TextChoices):
        PLANILHA = "planilha", "Planilha"
        BALCAO = "balcao", "Balcão"
        AGENTE = "agente", "Agente (confirmado)"
        MANUAL = "manual", "Manual"

    ref = models.CharField(max_length=64, help_text="Mesmo código opaco do cliente_ref das vendas")
    nome = models.CharField(max_length=120, blank=True)
    whatsapp = models.CharField(max_length=15, blank=True, help_text="Só dígitos, com DDI 55")
    faixa_etaria = models.CharField(max_length=8, choices=FaixaEtaria.choices, blank=True)
    tamanhos = models.JSONField(default=list, blank=True)
    categorias_interesse = models.JSONField(default=list, blank=True)
    observacao = models.CharField(max_length=300, blank=True)
    consentimento_contato = models.BooleanField(default=False)
    consentimento_em = models.DateTimeField(null=True, blank=True)
    origem = models.CharField(max_length=10, choices=Origem.choices, default=Origem.MANUAL)
    ultimo_contato_em = models.DateTimeField(null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["loja", "ref"], name="cliente_ref_unico_loja")
        ]
        indexes = [models.Index(fields=["loja", "whatsapp"])]
        ordering = ["nome", "ref"]

    def __str__(self):
        return self.nome or self.ref

    @property
    def primeiro_nome(self) -> str:
        return (self.nome or "").split(" ")[0]
