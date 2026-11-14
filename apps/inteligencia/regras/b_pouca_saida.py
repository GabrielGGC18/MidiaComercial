"""Regra B: Estoque com pouca saída (§4.3).

Dispara: saldo > 0 E nenhuma venda em X dias.
Bloqueia: estoque com mais de H horas sem atualização.
"""

from datetime import timedelta

from .base import EvidenciaCandidata, OportunidadeCandidata, ResultadoRegra

MAX_CANDIDATAS = 3


class RegraPoucaSaida:
    codigo = "B_POUCA_SAIDA"
    nome = "Estoque com pouca saída"
    versao = "1.1"
    campos_necessarios = {"estoque_atualizado"}

    def avaliar(self, ctx) -> ResultadoRegra:
        if not ctx.estoque:
            return ResultadoRegra(
                "bloqueada",
                [],
                motivo="Nenhum saldo de estoque importado.",
                como_liberar="Importe o CSV de estoque (sku;saldo;capturado_em).",
            )
        if not ctx.estoque_atualizado:
            return ResultadoRegra(
                "bloqueada",
                [],
                motivo=(
                    f"Estoque atualizado há {int(ctx.idade_estoque_horas)} h "
                    f"(limite {ctx.limiares.b_max_horas_estoque} h)."
                ),
                como_liberar="Importe um saldo de estoque recente.",
            )

        x = ctx.limiares.b_dias_sem_venda
        corte = ctx.agora - timedelta(days=x)
        historico_curto = ctx.inicio_historico is None or ctx.inicio_historico > corte

        candidatos = []
        for s in ctx.estoque:
            if s.saldo <= 0:
                continue
            ultima = ctx.ultima_venda.get(s.sku)
            if ultima is not None and ultima >= corte:
                continue
            candidatos.append((s, ultima))
        # mais capital parado primeiro
        candidatos.sort(
            key=lambda c: (c[0].saldo, -(c[1].timestamp() if c[1] else 0)), reverse=True
        )

        oportunidades = []
        for s, ultima in candidatos[:MAX_CANDIDATAS]:
            info = ctx.catalogo.get(s.sku)
            nome = info.nome if info else s.sku
            if ultima:
                dias = (ctx.agora - ultima).days
                desc_venda = f"Última venda há {dias} dias"
                ini = ultima.date()
            else:
                dias = (ctx.agora - ctx.inicio_historico).days if ctx.inicio_historico else x
                desc_venda = f"Nenhuma venda em {dias} dias de histórico"
                ini = (ctx.inicio_historico or corte).date()
            oportunidades.append(
                OportunidadeCandidata(
                    regra=self.codigo,
                    titulo=f"{nome} sem venda há {dias} dias",
                    acao_sugerida="Checar cadastro, exposição na loja e sazonalidade antes de remarcar preço.",
                    limitacao="Ausência de venda não prova desinteresse: pode ser exposição, cadastro ou época.",
                    alvo={"sku": s.sku, "rotulo": nome},
                    resumo=f"{s.saldo} unidades no estoque e {desc_venda[0].lower()}{desc_venda[1:]}.",
                    numeros=[
                        {"rotulo": "saldo informado", "valor": s.saldo, "unidade": "unidades"},
                        {"rotulo": "dias sem venda", "valor": dias, "unidade": "dias"},
                    ],
                    passos=[
                        "Conferir cadastro e preço no sistema",
                        "Melhorar a exposição na loja",
                        "Só depois avaliar remarcar o preço",
                    ],
                    urgencia=2 if s.saldo >= 10 else 1,
                    esforco=1,
                    evidencias=[
                        EvidenciaCandidata(
                            fonte="estoque",
                            descricao=f"Saldo {s.saldo} unidades",
                            valor=s.saldo,
                            periodo_inicio=s.capturado_em.date(),
                            periodo_fim=s.capturado_em.date(),
                            amostra=1,
                        ),
                        EvidenciaCandidata(
                            fonte="vendas",
                            descricao=desc_venda,
                            valor=dias,
                            periodo_inicio=ini,
                            periodo_fim=ctx.agora.date(),
                            amostra=max(dias, 1),
                        ),
                    ],
                    medicao_sugerida=f"Unidades vendidas de {nome} nos próximos 14 dias",
                )
            )
        status = "amostra_limitada" if historico_curto else "suficiente"
        return ResultadoRegra(
            status,
            oportunidades,
            motivo=f"Histórico menor que {x} dias." if historico_curto else None,
        )
