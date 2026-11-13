from django.db import models

from apps.core.models import ModeloDaLoja


class StatusDados(models.TextChoices):
    SUFICIENTE = "suficiente", "Dados suficientes"
    AMOSTRA_LIMITADA = "amostra_limitada", "Amostra limitada"
    BLOQUEADA = "bloqueada", "Cálculo bloqueado"


class ExecucaoMotor(ModeloDaLoja):
    janela_inicio = models.DateField()
    janela_fim = models.DateField()
    executado_em = models.DateTimeField(auto_now_add=True)
    qualidade = models.JSONField(
        default=dict, help_text="Cobertura cliente_ref, idade do estoque, completude de custo..."
    )
    bloqueios = models.JSONField(default=list, help_text="Regras bloqueadas e como liberar")

    class Meta:
        get_latest_by = "executado_em"

    def __str__(self):
        return f"Execução {self.pk} ({self.janela_inicio}–{self.janela_fim})"


class Oportunidade(ModeloDaLoja):
    execucao = models.ForeignKey(
        ExecucaoMotor, on_delete=models.CASCADE, related_name="oportunidades"
    )
    regra = models.CharField(max_length=40)
    versao_regra = models.CharField(max_length=10)
    status = models.CharField(max_length=20, choices=StatusDados.choices)
    titulo = models.CharField(max_length=200)
    acao_sugerida = models.TextField()
    limitacao = models.TextField()
    medicao_sugerida = models.TextField(blank=True)
    alvo = models.JSONField(default=dict)
    prioridade = models.PositiveSmallIntegerField()
    explicacao = models.TextField(blank=True, help_text="Texto por template (ou IA validada)")
    descartada_em = models.DateTimeField(null=True, blank=True)
    justificativa_descarte = models.TextField(blank=True)

    class Meta:
        ordering = ["prioridade"]

    def __str__(self):
        return self.titulo


class Evidencia(ModeloDaLoja):
    FONTES = [(f, f) for f in ("vendas", "demanda", "estoque", "acao")]

    oportunidade = models.ForeignKey(
        Oportunidade, on_delete=models.CASCADE, related_name="evidencias"
    )
    fonte = models.CharField(max_length=10, choices=FONTES)
    descricao = models.CharField(max_length=200)
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    periodo_inicio = models.DateField()
    periodo_fim = models.DateField()
    amostra = models.PositiveIntegerField()

    def __str__(self):
        return self.descricao

    def save(self, *args, **kwargs):
        # evidência sempre da mesma loja da oportunidade
        self.loja_id = self.oportunidade.loja_id
        super().save(*args, **kwargs)
