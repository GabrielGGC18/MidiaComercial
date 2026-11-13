"""Provedor Claude (opcional): tool use com as mesmas ferramentas do offline.

Liga com MIDIA_IA_HABILITADA=True, MIDIA_IA_PROVEDOR=claude e MIDIA_IA_API_KEY.
Modelo em MIDIA_IA_MODELO (padrão claude-haiku-4-5: o trabalho é escolher ferramenta e
preencher campos, não raciocínio longo). Recebe só texto mascarado e agregados.
Qualquer falha → o orquestrador refaz no provedor offline.

SDK oficial direto, sem LangChain/LangGraph: o laço de tool use cabe em ~40 linhas e o
estado (propostas, histórico, auditoria) já vive no Django. Ver docs/09.
"""

from __future__ import annotations

import json

from django.conf import settings
from django.utils import timezone

from ..ferramentas import ArgumentoInvalido, FerramentaNegada, disponiveis
from ..privacidade import ocultar
from . import Uso

# Parte fixa: igual para toda loja → vai para o cache de prompt.
SISTEMA = """Você é o agente do MidiaComercial, assistente de uma loja de moda no Brasil.

Regras:
- Você NUNCA grava dados. As ferramentas propor_* preparam registros que uma pessoa confirma.
- Procura no balcão ("procurou X e não tinha"): chame buscar_variante e depois propor_demanda
  com o produto_id encontrado. Se não achar o produto, use produto_texto e marque "produto"
  em campos_incertos.
- Marque em campos_incertos todo campo que a frase não deixa claro. Nunca chute tamanho ou cor.
- Motivos: indisponivel (sem estoque), variacao_ausente (sem o tamanho/cor), preco, prazo, outro.
- Faixas etárias (idade estimada): ate_17, 18_24, 25_34, 35_44, 45_59, 60_mais.
- Tokens como [TELEFONE_1] são dados mascarados: repasse exatamente como estão.
- Produto parado / vender mais: prospectar_produtos_em_baixa. Quem compra / horário:
  resumo_publico.
- Se uma ferramenta devolver erro, corrija os argumentos e tente de novo uma vez.
- Responda em português do Brasil, em 1 ou 2 frases, em linguagem de loja.
  Nunca invente números: só cite o que as ferramentas devolveram."""


def contexto_da_loja(ctx) -> str:
    """Parte variável: vocabulário da loja (sem dado pessoal) para o modelo acertar
    produto, tamanho e cor de primeira."""
    from apps.comercio.models import Produto, Variante

    vs = Variante.objects.da_loja(ctx.loja)
    cats = sorted(set(Produto.objects.da_loja(ctx.loja).values_list("categoria", flat=True)))
    tams = sorted(set(vs.values_list("tamanho", flat=True)) - {""})
    cores = sorted(set(vs.values_list("cor", flat=True)) - {""})
    return (
        f"Hoje: {timezone.localdate():%d/%m/%Y}. Papel de quem fala: {ctx.papel}.\n"
        f"Categorias da loja: {', '.join(cats[:30]) or '-'}.\n"
        f"Tamanhos cadastrados: {', '.join(tams[:40]) or '-'}.\n"
        f"Cores cadastradas: {', '.join(cores[:30]) or '-'}."
    )


class ProvedorClaude:
    nome = "claude"

    def __init__(self):
        import anthropic

        if not settings.MIDIA_IA_API_KEY or not settings.MIDIA_IA_MODELO:
            raise RuntimeError("Configure MIDIA_IA_API_KEY e MIDIA_IA_MODELO.")
        self.modelo = settings.MIDIA_IA_MODELO
        self.uso = Uso()
        # 1 retry só: no balcão, esperar é pior que cair no offline
        self.cliente = anthropic.Anthropic(
            api_key=settings.MIDIA_IA_API_KEY, timeout=settings.MIDIA_IA_TIMEOUT, max_retries=1
        )

    def _contar(self, r) -> None:
        u = getattr(r, "usage", None)
        if u is None:
            return
        self.uso.tokens_entrada += (
            (u.input_tokens or 0)
            + (getattr(u, "cache_read_input_tokens", 0) or 0)
            + (getattr(u, "cache_creation_input_tokens", 0) or 0)
        )
        self.uso.tokens_saida += u.output_tokens or 0

    def executar(self, ctx, texto: str, chamar, historico: list | None = None) -> str:
        ferramentas = [
            {"name": f.nome, "description": f.descricao, "input_schema": f.parametros}
            for f in disponiveis(ctx.papel)
        ]
        if ferramentas:
            ferramentas[-1] = {**ferramentas[-1], "cache_control": {"type": "ephemeral"}}
        sistema = [
            {"type": "text", "text": SISTEMA, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": contexto_da_loja(ctx)},
        ]
        mensagens = [*(historico or []), {"role": "user", "content": texto}]

        for _ in range(settings.MIDIA_AGENTE_MAX_PASSOS):
            r = self.cliente.messages.create(
                model=self.modelo,
                max_tokens=settings.MIDIA_IA_MAX_TOKENS,
                system=sistema,
                tools=ferramentas,
                messages=mensagens,
            )
            self._contar(r)
            if r.stop_reason == "refusal":
                raise RuntimeError("O modelo recusou a mensagem.")
            if r.stop_reason != "tool_use":
                final = "".join(b.text for b in r.content if b.type == "text").strip()
                if final:
                    return final
                if ctx.propostas:
                    return "Preparei o que consegui; revise as propostas abaixo."
                raise RuntimeError(f"Resposta vazia do modelo ({r.stop_reason}).")

            mensagens.append({"role": "assistant", "content": r.content})
            resultados = []
            for b in r.content:
                if b.type != "tool_use":
                    continue
                try:
                    saida = chamar(b.name, dict(b.input))
                    conteudo, erro = json.dumps(saida, default=str, ensure_ascii=False), False
                except (ArgumentoInvalido, FerramentaNegada) as exc:
                    conteudo, erro = str(exc), True  # o modelo pode corrigir
                resultados.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": b.id,
                        "content": ocultar(conteudo)[:4000],
                        "is_error": erro,
                    }
                )
            mensagens.append({"role": "user", "content": resultados})
        return "Preparei o que consegui; revise as propostas abaixo."
