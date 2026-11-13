from django.db import models

from apps.core.faixas import FaixaEtaria
from apps.core.models import ModeloDaLoja

DINHEIRO = {"max_digits": 12, "decimal_places": 2}


class Produto(ModeloDaLoja):
    referencia = models.CharField(max_length=60, help_text="Código do produto-pai")
    nome = models.CharField(max_length=160)
    categoria = models.CharField(max_length=80, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["loja", "referencia"], name="produto_unico_por_loja")
        ]

    def __str__(self):
        return self.nome


class Variante(ModeloDaLoja):
    """Uma variante por SKU: Camiseta Azul M ≠ Camiseta Azul G."""

    produto = models.ForeignKey(Produto, on_delete=models.CASCADE, related_name="variantes")
    sku = models.CharField(max_length=60)
    tamanho = models.CharField(max_length=10, blank=True)
    cor = models.CharField(max_length=40, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["loja", "sku"], name="sku_unico_por_loja")]

    def __str__(self):
        return f"{self.produto.nome} {self.cor} {self.tamanho}".strip()


class Pedido(ModeloDaLoja):
    class Status(models.TextChoices):
        CONCLUIDA = "concluida", "Concluída"
        CANCELADA = "cancelada", "Cancelada"

    sistema_origem = models.CharField(max_length=40, default="csv")
    pedido_id_origem = models.CharField(max_length=60)
    data_hora = models.DateTimeField(db_index=True)
    status = models.CharField(max_length=10, choices=Status.choices)
    # null = cliente não identificado (base da métrica de cobertura, §4.6)
    cliente_ref = models.CharField(  # noqa: DJ001
        max_length=64, null=True, blank=True, help_text="Opaco. Nunca CPF, nome ou telefone."
    )
    canal = models.CharField(max_length=30, blank=True)
    faixa_etaria = models.CharField(
        max_length=8,
        choices=FaixaEtaria.choices,
        blank=True,
        help_text="Estimada; nunca data de nascimento",
    )
    lote = models.ForeignKey(
        "importacao.LoteImportacao",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="pedidos",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["loja", "sistema_origem", "pedido_id_origem"],
                name="pedido_unico_por_origem",
            )
        ]
        indexes = [models.Index(fields=["loja", "data_hora"])]

    def __str__(self):
        return f"Pedido {self.pedido_id_origem}"


class ItemPedido(ModeloDaLoja):
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name="itens")
    item_id = models.CharField(max_length=30)
    variante = models.ForeignKey(Variante, on_delete=models.PROTECT, related_name="itens")
    quantidade = models.PositiveIntegerField()
    receita_item = models.DecimalField(**DINHEIRO, help_text="Com desconto, sem frete/tributo")
    custo_total_item = models.DecimalField(**DINHEIRO, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["pedido", "item_id"], name="item_unico_no_pedido")
        ]


class Devolucao(ModeloDaLoja):
    item_original = models.ForeignKey(
        ItemPedido, on_delete=models.CASCADE, related_name="devolucoes"
    )
    data = models.DateTimeField()
    quantidade = models.PositiveIntegerField()
    valor = models.DecimalField(**DINHEIRO)
