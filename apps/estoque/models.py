from django.db import models

from apps.core.models import ModeloDaLoja


class SnapshotEstoque(ModeloDaLoja):
    variante = models.ForeignKey(
        "comercio.Variante", on_delete=models.CASCADE, related_name="snapshots"
    )
    saldo = models.IntegerField()
    capturado_em = models.DateTimeField()
    lote = models.ForeignKey(
        "importacao.LoteImportacao",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="snapshots",
    )

    class Meta:
        indexes = [models.Index(fields=["loja", "variante", "capturado_em"])]
        get_latest_by = "capturado_em"

    def __str__(self):
        return f"{self.variante_id}: {self.saldo}"
