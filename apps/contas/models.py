from django.conf import settings
from django.db import models


class Loja(models.Model):
    nome = models.CharField(max_length=120)
    segmento = models.CharField(max_length=60, default="moda")
    horario_funcionamento = models.JSONField(
        default=dict, blank=True, help_text='Ex.: {"seg": ["09:00", "18:00"], "dom": null}'
    )
    fuso = models.CharField(max_length=60, default="America/Araguaina")
    demo = models.BooleanField(default=False, help_text="Dados sintéticos (selo DEMO na UI)")
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Vinculo(models.Model):
    class Papel(models.TextChoices):
        DONO = "dono", "Dono"
        GERENTE = "gerente", "Gerente"
        ATENDENTE = "atendente", "Atendente"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vinculos"
    )
    loja = models.ForeignKey(Loja, on_delete=models.CASCADE, related_name="vinculos")
    papel = models.CharField(max_length=12, choices=Papel.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "loja"], name="vinculo_unico_user_loja")
        ]

    def __str__(self):
        return f"{self.user} @ {self.loja} ({self.papel})"


class ConfiguracaoLoja(models.Model):
    """Limiares das regras (§4.3). Editáveis, nunca fixos no código."""

    loja = models.OneToOneField(Loja, on_delete=models.CASCADE, related_name="configuracao")
    janela_dias = models.PositiveSmallIntegerField(default=30)
    # Regra A: mínimo de registros de demanda para uma variante (N)
    a_min_demandas = models.PositiveSmallIntegerField(default=5)
    # Regra B: dias sem venda com saldo > 0 (X)
    b_dias_sem_venda = models.PositiveSmallIntegerField(default=21)
    # Regra B: estoque mais velho que isso bloqueia a regra (H)
    b_max_horas_estoque = models.PositiveSmallIntegerField(default=72)
    # Regra C: concentração categoria × dia/hora
    c_limiar_concentracao = models.DecimalField(max_digits=4, decimal_places=2, default="0.25")
    # Regra C (recorrência): cobertura mínima de cliente_ref
    c_min_cobertura_cliente = models.DecimalField(max_digits=4, decimal_places=2, default="0.30")

    def __str__(self):
        return f"Configuração de {self.loja}"
