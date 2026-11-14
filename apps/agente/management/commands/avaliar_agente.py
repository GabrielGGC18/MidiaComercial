"""Acurácia do agente nas frases de balcão (P2-03). Não grava nada.

Uso:
  python manage.py avaliar_agente                       # offline
  python manage.py avaliar_agente --provedor hermes     # na VPS (ponte do Hermes)
  python manage.py avaliar_agente --provedor claude     # exige MIDIA_IA_* (gasta tokens)
"""

from django.core.management.base import BaseCommand, CommandError

from apps.agente import avaliacao
from apps.contas.models import Loja


class Command(BaseCommand):
    help = "Acurácia do agente por campo, com as frases de balcão. Não grava nada."

    def add_arguments(self, parser):
        parser.add_argument("--provedor", choices=["offline", "claude", "hermes"], default="offline")
        parser.add_argument("--loja", default="Loja Demo Centro")

    def handle(self, *args, provedor="offline", loja="Loja Demo Centro", **o):
        lj = Loja.objects.filter(nome=loja).first()
        if lj is None:
            raise CommandError(f"Loja {loja!r} não encontrada (rode seed_demo).")
        if provedor == "offline":
            avaliar = avaliacao.avaliar_offline
        else:
            self.stdout.write(
                self.style.WARNING(f"Provedor {provedor}: chama o LLM de verdade (custo e tempo).")
            )
            if provedor == "claude":
                from apps.agente.provedores.claude import ProvedorClaude as P
            else:
                from apps.agente.provedores.hermes import ProvedorHermes as P
            avaliar = lambda lj_, texto: avaliacao.avaliar_provedor(lj_, texto, P())  # noqa: E731

        r = avaliacao.relatorio(lj, avaliar)
        self.stdout.write(f"Provedor: {provedor} · {r['frases']} frases · {r['frases_ok']} inteiras certas")
        for campo, (ok, total) in sorted(r["campos"].items()):
            self.stdout.write(f"  {campo:<14} {ok:>3}/{total:<3} {round(100 * ok / total):>4}%")
        if r["erros"]:
            self.stdout.write("Erros:")
            for texto, campo, esperado, veio in r["erros"]:
                self.stdout.write(f'  - "{texto}" → {campo}: esperado {esperado!r}, veio {veio!r}')
