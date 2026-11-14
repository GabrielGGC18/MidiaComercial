"""Retenção (LGPD) do texto do agente. Roda todo dia pelo container de rotinas.

Uso: python manage.py limpar_agente [--simular] [--dias-conversa 90]
"""

from django.core.management.base import BaseCommand

from apps.agente.services import limpar


class Command(BaseCommand):
    help = "Apaga texto antigo do agente (LGPD). Use --simular para só contar."

    def add_arguments(self, parser):
        parser.add_argument("--simular", action="store_true")
        parser.add_argument("--dias-conversa", type=int, default=90)
        parser.add_argument("--dias-auditoria", type=int, default=180)
        parser.add_argument("--dias-rejeitada", type=int, default=30)

    def handle(self, *args, **o):
        r = limpar(
            dias_conversa=o["dias_conversa"],
            dias_auditoria=o["dias_auditoria"],
            dias_rejeitada=o["dias_rejeitada"],
            simular=o["simular"],
        )
        prefixo = "Simulação: apagaria" if o["simular"] else "Apagado"
        self.stdout.write(
            f"{prefixo}: {r['conversas']} conversas, {r['chamadas']} chamadas, "
            f"{r['rejeitadas']} propostas rejeitadas"
        )
