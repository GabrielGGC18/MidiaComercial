from .models import EventoAuditoria


def registrar_evento(loja, usuario, acao: str, objeto: str, **detalhes) -> EventoAuditoria:
    """Trilha append-only das ações relevantes (importação, descarte, plano, medição)."""
    return EventoAuditoria.objects.create(
        loja=loja, usuario=usuario, acao=acao, objeto=objeto, detalhes=detalhes
    )
