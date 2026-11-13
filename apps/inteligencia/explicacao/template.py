"""Explicação determinística, sempre disponível (§9). A IA, se ligada, só reescreve este texto."""

from ..regras.base import OportunidadeCandidata

STATUS_TXT = {
    "suficiente": "Os dados são suficientes para essa leitura.",
    "amostra_limitada": "A amostra é pequena ou o dado está desatualizado: trate como pista, não como certeza.",
}


class ExplicadorTemplate:
    """Só o "por quê". A ação sugerida e a limitação têm bloco próprio na tela (UX-07):
    repetir aqui fazia a limitação aparecer duas vezes no detalhe."""

    def explicar(self, op: OportunidadeCandidata, status: str) -> str:
        evid = "; ".join(e.descricao.lower() for e in op.evidencias)
        return f"Sugerimos isso porque {evid}. {STATUS_TXT.get(status, '')}".strip()
