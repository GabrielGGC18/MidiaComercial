"""Seed sintético da demo (P0-8): 2 lojas, 90 dias de vendas com ruído, demandas e estoque.

Uso: python manage.py seed_demo [--reset] [--semente 42]
"""

from django.core.management.base import BaseCommand

from apps.core.demo import criar_demo


class Command(BaseCommand):
    help = "Cria dados 100% sintéticos para a demo (2 lojas)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Apaga lojas demo antes")
        parser.add_argument("--semente", type=int, default=42)

    def handle(self, *args, reset=False, semente=42, **opts):
        criar_demo(reset=reset, semente=semente, log=self.stdout.write)
