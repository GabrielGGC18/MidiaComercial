"""Regra C: Padrão de público (§4.3).

C1 (concentração): categoria × dia/faixa de 2 h acima do limiar.
C2 (recorrência): bloqueia se cobertura de cliente_ref < mínimo; senão sinaliza recorrência baixa.
"""

from collections import Counter, defaultdict
from decimal import Decimal

from .base import EvidenciaCandidata, OportunidadeCandidata, ResultadoRegra

DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
MIN_ITENS_CATEGORIA = 20
MIN_ITENS_SUFICIENTE = 40
RECORRENCIA_BAIXA = Decimal("0.25")


def _pct(x: Decimal) -> int:
    return int((x * 100).quantize(Decimal("1")))


class RegraPadraoPublico:
    codigo = "C_PADRAO_PUBLICO"
    nome = "Padrão de público"
    versao = "1.0"
    campos_necessarios = {"vendas"}

    def avaliar(self, ctx) -> ResultadoRegra:
        if not ctx.vendas:
            return ResultadoRegra(
                "bloqueada",
                [],
                motivo="Nenhuma venda na janela.",
                como_liberar="Importe o CSV de vendas do período.",
            )
        unidades_cat = Counter()
        slots: dict[str, Counter] = defaultdict(Counter)
        for v in ctx.vendas:
            unidades_cat[v.categoria] += v.quantidade
            faixa = (v.data_hora.hour // 2) * 2
            slots[v.categoria][(v.data_hora.weekday(), faixa)] += v.quantidade

        melhor = None
        for cat, total in unidades_cat.items():
            if total < MIN_ITENS_CATEGORIA:
                continue
            (dia, faixa), qtd = slots[cat].most_common(1)[0]
            share = Decimal(qtd) / Decimal(total)
            if share >= ctx.limiares.c_limiar_concentracao:
                score = share * Decimal(total)
                if melhor is None or score > melhor[0]:
                    melhor = (score, cat, dia, faixa, qtd, total, share)

        if melhor is None:
            return ResultadoRegra(
                "suficiente", [], motivo="Nenhuma categoria concentrada num dia/horário."
            )
        _, cat, dia, faixa, qtd, total, share = melhor
        nome_dia = DIAS[dia].capitalize()
        status = "suficiente" if total >= MIN_ITENS_SUFICIENTE else "amostra_limitada"
        op = OportunidadeCandidata(
            regra=self.codigo,
            titulo=f"{nome_dia} {faixa}–{faixa + 2}h concentra {_pct(share)}% de {cat}",
            acao_sugerida=(
                f"Testar exposição de {cat} em destaque e reforço de atendimento "
                f"na {DIAS[dia]} das {faixa}h às {faixa + 2}h."
            ),
            limitacao="Associação observada, não causa: o horário pode refletir só o movimento da loja.",
            alvo={"categoria": cat, "dia": dia, "faixa": faixa},
            urgencia=1,
            esforco=1,
            evidencias=[
                EvidenciaCandidata(
                    fonte="vendas",
                    descricao=f"{qtd} de {total} unidades de {cat} vendidas nesse horário",
                    valor=qtd,
                    periodo_inicio=ctx.janela_inicio,
                    periodo_fim=ctx.janela_fim,
                    amostra=total,
                )
            ],
            medicao_sugerida=f"Unidades de {cat} vendidas na {DIAS[dia]} {faixa}–{faixa + 2}h",
        )
        return ResultadoRegra(status, [op])


class RegraRecorrencia:
    codigo = "C_RECORRENCIA"
    nome = "Recorrência de clientes"
    versao = "1.0"
    campos_necessarios = {"cliente_ref"}

    def avaliar(self, ctx) -> ResultadoRegra:
        cobertura = ctx.cobertura_cliente
        minimo = ctx.limiares.c_min_cobertura_cliente
        if cobertura < minimo:
            return ResultadoRegra(
                "bloqueada",
                [],
                motivo=f"Cobertura de cliente {_pct(cobertura)}% (< {_pct(minimo)}%).",
                como_liberar="Registre um código de cliente (sem CPF/nome) em mais vendas no PDV.",
            )
        por_cliente: dict[str, set] = defaultdict(set)
        for v in ctx.vendas:
            if v.cliente_ref:
                por_cliente[v.cliente_ref].add(v.pedido_id)
        n_cli = len(por_cliente)
        recorrentes = sum(1 for p in por_cliente.values() if len(p) >= 2)
        taxa = Decimal(recorrentes) / Decimal(n_cli) if n_cli else Decimal("0")
        if taxa >= RECORRENCIA_BAIXA:
            return ResultadoRegra("suficiente", [], motivo="Recorrência dentro do esperado.")
        status = "suficiente" if n_cli >= 30 else "amostra_limitada"
        return ResultadoRegra(
            status,
            [
                OportunidadeCandidata(
                    regra=self.codigo,
                    titulo=f"Só {_pct(taxa)}% dos clientes identificados voltaram a comprar",
                    acao_sugerida="Testar um contato pós-venda simples (ex.: aviso de reposição) com clientes identificados.",
                    limitacao=f"Vale só para os {_pct(cobertura)}% de pedidos com cliente identificado.",
                    alvo={"metrica": "recorrencia"},
                    urgencia=1,
                    esforco=2,
                    evidencias=[
                        EvidenciaCandidata(
                            fonte="vendas",
                            descricao=f"{recorrentes} de {n_cli} clientes com 2+ compras",
                            valor=recorrentes,
                            periodo_inicio=ctx.janela_inicio,
                            periodo_fim=ctx.janela_fim,
                            amostra=n_cli,
                        )
                    ],
                    medicao_sugerida="% de clientes identificados com 2+ compras na próxima janela",
                )
            ],
        )
