"""Agente do MidiaComercial: ele PROPÕE, a pessoa CONFIRMA (docs/04 §6, docs/07 §4.6)."""

from django.conf import settings
from django.db import models

from apps.core.models import ModeloDaLoja


class SessaoAgente(ModeloDaLoja):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    provedor = models.CharField(max_length=20, default="offline")

    def __str__(self):
        return f"Sessão {self.pk}"


class Campanha(ModeloDaLoja):
    """Grupo de propostas de contato para um produto/categoria em baixa."""

    class Status(models.TextChoices):
        PROPOSTA = "proposta", "Proposta"
        ATIVA = "ativa", "Em andamento"
        ENCERRADA = "encerrada", "Encerrada"

    titulo = models.CharField(max_length=200)
    gatilho = models.CharField(max_length=30)  # estoque_parado | queda_vendas
    alvo = models.JSONField(default=dict)  # {sku, rotulo, categoria, tamanhos_com_estoque}
    motivo = models.CharField(max_length=300)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PROPOSTA)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return self.titulo


class PropostaAgente(ModeloDaLoja):
    class Tipo(models.TextChoices):
        DEMANDA = "demanda", "Registro de demanda"
        CLIENTE = "cliente", "Cadastro de cliente"
        CONTATO = "contato", "Contato com cliente"

    class Status(models.TextChoices):
        PENDENTE = "pendente", "Aguardando confirmação"
        CONFIRMADA = "confirmada", "Confirmada"
        REJEITADA = "rejeitada", "Rejeitada"
        ENVIADA = "enviada", "Mensagem enviada"

    sessao = models.ForeignKey(
        SessaoAgente, on_delete=models.SET_NULL, null=True, blank=True, related_name="propostas"
    )
    campanha = models.ForeignKey(
        Campanha, on_delete=models.CASCADE, null=True, blank=True, related_name="propostas"
    )
    cliente = models.ForeignKey(
        "clientes.Cliente", on_delete=models.CASCADE, null=True, blank=True, related_name="+"
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDENTE)
    resumo = models.CharField(max_length=200)
    dados = models.JSONField(default=dict)
    campos_incertos = models.JSONField(default=list)
    motivos = models.JSONField(default=list, help_text="Por que o agente propôs (legível)")
    limitacao = models.CharField(max_length=300, blank=True)
    pontuacao = models.PositiveSmallIntegerField(default=0)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    decidido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, related_name="+"
    )
    decidido_em = models.DateTimeField(null=True, blank=True)
    enviado_em = models.DateTimeField(null=True, blank=True)
    objeto_criado = models.CharField(max_length=60, blank=True)

    class Meta:
        ordering = ["-pontuacao", "-criado_em"]
        indexes = [models.Index(fields=["loja", "status", "tipo"])]

    def __str__(self):
        return self.resumo


class ChamadaFerramenta(ModeloDaLoja):
    """Auditoria de cada ferramenta usada pelo agente (entrada já mascarada)."""

    sessao = models.ForeignKey(
        SessaoAgente, on_delete=models.SET_NULL, null=True, blank=True, related_name="chamadas"
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+"
    )
    ferramenta = models.CharField(max_length=60)
    entrada = models.JSONField(default=dict)
    saida_resumo = models.CharField(max_length=300, blank=True)
    ok = models.BooleanField(default=True)
    duracao_ms = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.ferramenta} ({'ok' if self.ok else 'erro'})"
