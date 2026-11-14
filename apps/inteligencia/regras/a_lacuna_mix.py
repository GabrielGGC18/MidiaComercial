"""Regra A: Lacuna de mix (§4.3).

Dispara: demanda ≥ N registros para uma variante na janela E saldo = 0 ou ausente.
Bloqueia: nenhum registro de demanda na janela.
"""

from collections import Counter, defaultdict

from .base import EvidenciaCandidata, OportunidadeCandidata, ResultadoRegra

MOTIVOS = {
    "indisponivel": "sem estoque",
    "variacao_ausente": "sem o tamanho ou a cor",
    "preco": "preço",
    "prazo": "prazo",
    "outro": "outro motivo",
}
MAX_ALTERNATIVAS = 4


def alternativas(ctx, sku: str | None) -> list[dict]:
    """Outras cores/tamanhos do MESMO produto com saldo, só se o estoque estiver dentro do
    prazo da loja. Estoque velho → lista vazia (nunca oferecer o que pode não existir)."""
    info = ctx.catalogo.get(sku) if sku else None
    if not info or not info.produto or not ctx.estoque_atualizado:
        return []
    out = []
    for s in sorted(ctx.estoque, key=lambda s: -s.saldo):
        irma = ctx.catalogo.get(s.sku)
        if s.sku != sku and s.saldo > 0 and irma and irma.produto == info.produto:
            out.append({"sku": s.sku, "rotulo": irma.nome, "saldo": s.saldo})
    return out[:MAX_ALTERNATIVAS]


class RegraLacunaMix:
    codigo = "A_LACUNA_MIX"
    nome = "Lacuna de mix"
    versao = "1.1"
    campos_necessarios = {"demanda"}

    def avaliar(self, ctx) -> ResultadoRegra:
        if not ctx.demandas:
            return ResultadoRegra(
                "bloqueada",
                [],
                motivo="Nenhum registro de procura não atendida na janela.",
                como_liberar="Peça à equipe do balcão para registrar quando o cliente não encontrar algo.",
            )

        n_min = ctx.limiares.a_min_demandas
        grupos: dict[str, list] = defaultdict(list)
        for d in ctx.demandas:
            chave = d.sku or f"txt:{d.rotulo.lower()}"
            grupos[chave].append(d)

        atualizado = ctx.estoque_atualizado
        idade = ctx.idade_estoque_horas
        oportunidades = []
        for regs in grupos.values():
            if len(regs) < n_min:
                continue
            sku = regs[0].sku
            saldo = ctx.saldo(sku) if sku else None
            if saldo is not None and saldo.saldo > 0:
                continue  # tem estoque: não é lacuna de mix
            datas = [r.registrado_em.date() for r in regs]
            ini, fim = min(datas), max(datas)
            motivos = Counter(r.motivo for r in regs)
            rotulo = regs[0].rotulo
            n = len(regs)
            horas = int((ctx.agora - saldo.capturado_em).total_seconds() // 3600) if saldo else None

            evid = [
                EvidenciaCandidata(
                    fonte="demanda",
                    descricao=f"{n} procuraram e não tinha",
                    valor=n,
                    periodo_inicio=ini,
                    periodo_fim=fim,
                    amostra=n,
                )
            ]
            if saldo is not None:
                evid.append(
                    EvidenciaCandidata(
                        fonte="estoque",
                        descricao=f"Saldo informado: 0, atualizado há {horas} h",
                        valor=0,
                        periodo_inicio=saldo.capturado_em.date(),
                        periodo_fim=saldo.capturado_em.date(),
                        amostra=1,
                    )
                )
            else:
                evid.append(
                    EvidenciaCandidata(
                        fonte="estoque",
                        descricao="Variação não existe no catálogo/estoque",
                        valor=0,
                        periodo_inicio=ini,
                        periodo_fim=fim,
                        amostra=1,
                    )
                )

            limitacao = (
                f"São {n} atendimentos, não {n} compradores únicos nem {n} vendas garantidas."
            )
            if not atualizado:
                limitacao += f" O estoque está desatualizado (há {int(idade or 0)} h): confira antes de agir."
            numeros = [{"rotulo": "registros de procura", "valor": n, "unidade": "registros"}]
            numeros += [
                {"rotulo": MOTIVOS.get(m, m), "valor": q, "unidade": "registros"}
                for m, q in motivos.most_common()
            ]
            if saldo is not None:
                numeros.append(
                    {
                        "rotulo": "saldo informado",
                        "valor": 0,
                        "unidade": "unidades",
                        "detalhe": f"contado há {horas} h",
                    }
                )
            oportunidades.append(
                OportunidadeCandidata(
                    regra=self.codigo,
                    titulo=f"Investigar reposição: {rotulo}",
                    resumo=(
                        f"{n} registros de procura nesta janela e o saldo informado é zero."
                        if saldo is not None
                        else f"{n} registros de procura por uma variação que a loja não tem no catálogo."
                    ),
                    numeros=numeros,
                    passos=(
                        ["Conferir o estoque físico", "Consultar o fornecedor antes de comprar"]
                        if sku
                        else ["Consultar fornecedor e custo", "Decidir se a variação entra no mix"]
                    ),
                    alternativas=alternativas(ctx, sku),
                    acao_sugerida=(
                        "Conferir estoque físico e consultar fornecedor antes de comprar."
                        if sku
                        else "Avaliar incluir essa variação no mix: consultar fornecedor e custo."
                    ),
                    limitacao=limitacao,
                    alvo={"sku": sku, "rotulo": rotulo, "motivos": dict(motivos)},
                    urgencia=3 if n >= 2 * n_min else 2,
                    esforco=2,
                    evidencias=evid,
                    medicao_sugerida=(
                        f"Novos registros de procura sem estoque de {rotulo} nos próximos 7 dias"
                    ),
                )
            )

        if not oportunidades:
            return ResultadoRegra(
                "suficiente", [], motivo=f"Nenhuma variante chegou a {n_min} procuras sem estoque."
            )
        status = "suficiente" if atualizado else "amostra_limitada"
        return ResultadoRegra(
            status,
            oportunidades,
            motivo=None
            if atualizado
            else "Estoque desatualizado: a falta pode já ter sido resolvida.",
        )
