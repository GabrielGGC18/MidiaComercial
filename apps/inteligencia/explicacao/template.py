"""Explicação determinística, sempre disponível (§9). A IA, se ligada, só reescreve este texto."""

from ..regras.base import OportunidadeCandidata

STATUS_TXT = {
    "suficiente": "Os dados são suficientes para essa leitura.",
    "amostra_limitada": "A amostra é pequena ou o dado está desatualizado: trate como pista, não como certeza.",
}


class ExplicadorTemplate:
    def explicar(self, op: OportunidadeCandidata, status: str) -> str:
        evid = "; ".join(e.descricao.lower() for e in op.evidencias)
        return (
            f"Sugerimos isso porque {evid}. "
            f"{STATUS_TXT.get(status, '')} "
            f"Próximo passo: {op.acao_sugerida[0].lower()}{op.acao_sugerida[1:]} "
            f"Atenção: {op.limitacao[0].lower()}{op.limitacao[1:]}"
        ).strip()
