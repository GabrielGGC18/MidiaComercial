"""Desbloqueia na hora uma conta travada pelo limite global de falhas de login.

python manage.py desbloquear_login <usuario>
"""

from django.core.management.base import BaseCommand

from apps.core.limites import desbloquear_conta


class Command(BaseCommand):
    help = "Zera o contador global de falhas de login de uma conta."

    def add_arguments(self, parser):
        parser.add_argument("usuario")

    def handle(self, *args, usuario, **opts):
        if desbloquear_conta(usuario):
            self.stdout.write(self.style.SUCCESS(f"Conta {usuario} desbloqueada."))
        else:
            self.stdout.write(f"Conta {usuario} não estava bloqueada pelo limite global.")
