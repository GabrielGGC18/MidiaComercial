"""Faixa etária (estimada). Minimização LGPD: nunca data de nascimento."""

from django.db import models


class FaixaEtaria(models.TextChoices):
    ATE_17 = "ate_17", "Até 17"
    F18_24 = "18_24", "18–24"
    F25_34 = "25_34", "25–34"
    F35_44 = "35_44", "35–44"
    F45_59 = "45_59", "45–59"
    F60_MAIS = "60_mais", "60+"


FAIXAS_ORDEM = [c.value for c in FaixaEtaria]


def faixa_da_idade(idade: int) -> str | None:
    if idade < 0 or idade > 110:
        return None
    if idade <= 17:
        return FaixaEtaria.ATE_17
    if idade <= 24:
        return FaixaEtaria.F18_24
    if idade <= 34:
        return FaixaEtaria.F25_34
    if idade <= 44:
        return FaixaEtaria.F35_44
    if idade <= 59:
        return FaixaEtaria.F45_59
    return FaixaEtaria.F60_MAIS


def normalizar_faixa(valor: str | None) -> str | None:
    """Aceita '25_34', '25-34', '25–34', '30' (idade) ou '60+'. Vazio → None."""
    if valor is None:
        return None
    v = str(valor).strip().lower().replace("–", "-").replace(" ", "")
    if not v:
        return None
    if v in FAIXAS_ORDEM:
        return v
    mapa = {
        "ate17": "ate_17", "até17": "ate_17", "-17": "ate_17", "18-24": "18_24", "25-34": "25_34",
        "35-44": "35_44", "45-59": "45_59", "60+": "60_mais", "60-mais": "60_mais",
    }  # fmt: skip
    if v in mapa:
        return mapa[v]
    if v.isdigit():
        return faixa_da_idade(int(v))
    raise ValueError("faixa etária inválida (use 18-24, 25-34, 35-44, 45-59, 60+ ou a idade)")
