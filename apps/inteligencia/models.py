from django.db import models

from apps.core.models import ModeloDaLoja


def chave_de(regra: str, alvo: dict) -> str:
    """Identidade do alvo: SKU quando existe; senão o texto da procura, a categoria ou a
    métrica. Nunca o título (que muda de texto entre versões das regras)."""
    alvo = alvo or {}
    k = alvo.get("sku") or (alvo.get("rotulo") or "").strip().lower()
    k = k or alvo.get("categoria") or alvo.get("metrica") or ""
    return f"{regra}:{k}"[:200]


class StatusDados(models.TextChoices):
    SUFICIENTE = "suficiente", "Dados suficientes"
    AMOSTRA_LIMITADA = "amostra_limitada", "Amostra limitada"
    BLOQUEADA = "bloqueada", "Cálculo bloqueado"


class ExecucaoMotor(ModeloDaLoja):
    """Fotografia imutável de uma análise. Recalcular cria outra; a anterior fica (com os
    cartões e IDs dela) para auditoria e para quem estava com um detalhe aberto."""

    janela_inicio = models.DateField()
    janela_fim = models.DateField()
    executado_em = models.DateTimeField(auto_now_add=True)
    qualidade = models.JSONField(
        default=dict, help_text="Cobertura cliente_ref, idade do estoque, completude de custo..."
    )
    bloqueios = models.JSONField(default=list, help_text="Regras bloqueadas e como liberar")
    # Assinatura dos dados de entrada (vendas, estoque, demandas, decisões, configuração,
    # janela). Mesma revisão + mesma versão do motor = mesma análise: não recalcula.
    revisao_dados = models.CharField(max_length=32, blank=True, db_index=True)
    versao_motor = models.CharField(max_length=10, default="1")
    fontes = models.JSONField(default=dict, help_text="Datas das fontes no momento da análise")
    duracao_ms = models.PositiveIntegerField(default=0)

    class Meta:
        get_latest_by = "executado_em"
        constraints = [
            # duas requisições simultâneas com os mesmos dados não publicam duas análises
            models.UniqueConstraint(
                fields=["loja", "revisao_dados", "versao_motor"],
                condition=~models.Q(revisao_dados=""),
                name="execucao_unica_por_revisao",
            )
        ]

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
    # Identidade estável do alvo entre execuções ("A_LACUNA_MIX:CJE-AZ-42"): liga o cartão
    # de hoje ao de ontem para não repetir sugestão com plano, descarte ou adiamento.
    chave = models.CharField(max_length=200, blank=True)
    prioridade = models.PositiveSmallIntegerField()
    explicacao = models.TextField(blank=True, help_text="Texto por template (ou IA validada)")
    # Campos estruturados (UX-07): a tela monta a decisão sem colar textos
    resumo = models.TextField(blank=True)
    numeros = models.JSONField(default=list, blank=True)
    passos = models.JSONField(default=list, blank=True)
    alternativas = models.JSONField(default=list, blank=True)
    frescor = models.JSONField(default=dict, blank=True)
    descartada_em = models.DateTimeField(null=True, blank=True)
    justificativa_descarte = models.TextField(blank=True)
    adiada_ate = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["prioridade"]
        indexes = [models.Index(fields=["loja", "chave"], name="oportunidade_loja_chave")]

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
