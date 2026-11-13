"""Provedor Claude (opcional): tool use com as mesmas ferramentas. Só com MIDIA_IA_HABILITADA,
MIDIA_IA_PROVEDOR=claude, MIDIA_IA_API_KEY e MIDIA_IA_MODELO. Recebe texto já mascarado.
Qualquer falha → o orquestrador cai no provedor offline.
"""

from __future__ import annotations

import json

from django.conf import settings

from ..ferramentas import disponiveis

SISTEMA = """Você é o agente do MidiaComercial, assistente de uma loja de moda.
Regras:
- Você NUNCA grava dados. Use as ferramentas propor_* para preparar registros que uma pessoa confirma.
- Para registrar uma procura no balcão: chame buscar_variante e depois propor_demanda com o produto_id.
- Marque em campos_incertos tudo que não estiver claro na frase.
- Faixas etárias válidas: ate_17, 18_24, 25_34, 35_44, 45_59, 60_mais (idade estimada).
- Tokens como [TELEFONE_1] são dados mascarados: repasse-os exatamente como estão.
- Responda em português do Brasil, curto, em linguagem de loja. Nunca invente números."""


class ProvedorClaude:
    nome = "claude"

    def __init__(self):
        import anthropic

        if not settings.MIDIA_IA_API_KEY or not settings.MIDIA_IA_MODELO:
            raise RuntimeError("Configure MIDIA_IA_API_KEY e MIDIA_IA_MODELO.")
        self.cliente = anthropic.Anthropic(api_key=settings.MIDIA_IA_API_KEY, timeout=20)

    def executar(self, ctx, texto: str, chamar) -> str:
        ferramentas = [
            {"name": f.nome, "description": f.descricao, "input_schema": f.parametros}
            for f in disponiveis(ctx.papel)
        ]
        mensagens = [{"role": "user", "content": texto}]
        for _ in range(settings.MIDIA_AGENTE_MAX_PASSOS):
            r = self.cliente.messages.create(
                model=settings.MIDIA_IA_MODELO,
                max_tokens=800,
                system=SISTEMA,
                tools=ferramentas,
                messages=mensagens,
            )
            if r.stop_reason != "tool_use":
                return "".join(b.text for b in r.content if b.type == "text").strip()
            mensagens.append({"role": "assistant", "content": r.content})
            resultados = []
            for b in r.content:
                if b.type != "tool_use":
                    continue
                try:
                    saida = chamar(b.name, dict(b.input))
                    resultados.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": b.id,
                            "content": json.dumps(saida, default=str)[:4000],
                        }
                    )
                except Exception as exc:  # noqa: BLE001
                    resultados.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": b.id,
                            "content": str(exc),
                            "is_error": True,
                        }
                    )
            mensagens.append({"role": "user", "content": resultados})
        return "Preparei o que consegui; revise as propostas abaixo."
