"""Mascara dados pessoais antes de qualquer provedor externo (LLM) e restaura depois."""

import re

PADROES = [
    ("EMAIL", re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")),
    ("CPF", re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")),
    ("TELEFONE", re.compile(r"(?:\+?55\s?)?\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b")),
]


def mascarar(texto: str) -> tuple[str, dict[str, str]]:
    mapa: dict[str, str] = {}
    for rotulo, padrao in PADROES:

        def troca(m, rotulo=rotulo):
            chave = f"[{rotulo}_{sum(1 for k in mapa if k.startswith('[' + rotulo)) + 1}]"
            mapa[chave] = m.group(0)
            return chave

        texto = padrao.sub(troca, texto)
    return texto, mapa


def restaurar(valor, mapa: dict[str, str]):
    if isinstance(valor, str):
        for k, v in mapa.items():
            valor = valor.replace(k, v)
        return valor
    if isinstance(valor, dict):
        return {k: restaurar(v, mapa) for k, v in valor.items()}
    if isinstance(valor, list):
        return [restaurar(v, mapa) for v in valor]
    return valor


def ocultar(texto: str) -> str:
    """Saída de ferramenta indo para o LLM: apaga qualquer dado pessoal que escapou.
    Usa um marcador fixo (não reversível) para não colidir com os tokens da frase."""
    for rotulo, padrao in PADROES:
        texto = padrao.sub(f"[{rotulo}_OCULTO]", texto)
    return texto
