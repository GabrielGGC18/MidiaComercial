"""Base multi-tenant por linha (§8.1).

Toda entidade operacional herda de ModeloDaLoja e é consultada via
Model.objects.da_loja(loja). A loja vem SEMPRE da sessão, nunca do request/arquivo.
"""

from django.core.exceptions import PermissionDenied
from django.db import models


class LojaQuerySet(models.QuerySet):
    def da_loja(self, loja):
        if loja is None:
            raise PermissionDenied("Loja não definida")
        return self.filter(loja=loja)


class ModeloDaLoja(models.Model):
    loja = models.ForeignKey("contas.Loja", on_delete=models.CASCADE, related_name="+")
    criado_em = models.DateTimeField(auto_now_add=True)

    objects = LojaQuerySet.as_manager()

    class Meta:
        abstract = True
