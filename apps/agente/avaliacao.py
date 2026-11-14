"""Avaliação do agente com frases reais de balcão (P2-03).

Mede quanto cada provedor acerta por campo, SEM gravar nada:
- offline: usa planejar() (só devolve as chamadas planejadas);
- claude / hermes: roda o provedor com um `chamar` falso que executa de verdade só as
  ferramentas de LEITURA (buscar_variante, buscar_clientes, resumo_publico) e apenas registra
  as que gravariam (propor_*, prospectar_*).

As frases ficam em apps/agente/tests/frases_balcao.json. O teste parametrizado trava regressão
do offline; o comando `avaliar_agente` imprime a acurácia e compara provedores.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from apps.comercio.models import Produto

from .ferramentas import ArgumentoInvalido, Contexto, obter, validar_args
from .provedores.offline import planejar

ARQUIVO = Path(__file__).parent / "tests" / "frases_balcao.json"
LEITURA = {"buscar_variante", "buscar_clientes", "resumo_publico"}


def frases() -> list[dict]:
    return json.loads(ARQUIVO.read_text(encoding="utf-8"))


def _normalizar(loja, nome: str, args: dict) -> dict:
    out = {"ferramenta": nome, **args}
    pid = args.get("produto_id")
    if pid:
        p = Produto.objects.da_loja(loja).filter(pk=pid).first()
        out["sku_produto"] = p.referencia if p else None
    return out


def avaliar_offline(loja, texto: str) -> dict:
    ctx = Contexto(loja=loja, usuario=None, papel="gerente")
    plano = planejar(ctx, texto)
    if not plano:  # o agente respondeu que não entendeu (não criou nada)
        return {"ferramenta": None}
    nome, args = plano[0]
    return _normalizar(loja, nome, args)


def avaliar_provedor(loja, texto: str, provedor) -> dict:
    """Primeira chamada que GRAVARIA (a decisão do agente); leitura roda de verdade."""
    ctx = Contexto(loja=loja, usuario=None, papel="gerente")
    decisoes: list[tuple[str, dict]] = []

    def chamar(nome: str, args: dict):
        f = obter(nome, "gerente")
        limpos = validar_args(f, args)
        if nome in LEITURA:
            return f.funcao(ctx, **limpos)
        decisoes.append((nome, limpos))
        return {"ok": True, "proposta_id": 0, "resumo": "registrado na avaliação"}

    try:
        provedor.executar(ctx, texto, chamar, [])
    except ArgumentoInvalido:
        pass
    if not decisoes:
        return {"ferramenta": None}
    return _normalizar(loja, *decisoes[0])


def conferir(esperado: dict, obtido: dict) -> dict[str, bool]:
    return {campo: obtido.get(campo) == valor for campo, valor in esperado.items()}


def relatorio(loja, avaliar) -> dict:
    """Roda todas as frases e devolve acertos por campo e a lista de erros."""
    acertos, totais, erros = Counter(), Counter(), []
    lista = frases()
    frases_ok = 0
    for f in lista:
        obtido = avaliar(loja, f["texto"])  # uma chamada por frase (no LLM, custa tempo)
        resultado = conferir(f["esperado"], obtido)
        frases_ok += all(resultado.values())
        for campo, ok in resultado.items():
            totais[campo] += 1
            acertos[campo] += ok
            if not ok:
                erros.append((f["texto"], campo, f["esperado"][campo], obtido.get(campo)))
    return {
        "frases": len(lista),
        "frases_ok": frases_ok,
        "campos": {c: (acertos[c], totais[c]) for c in totais},
        "erros": erros,
    }
