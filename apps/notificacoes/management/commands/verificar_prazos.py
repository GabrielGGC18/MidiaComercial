"""Eventos que dependem do TEMPO (ninguém clica para eles acontecerem).

Rodar periodicamente (cron do VPS), ex.: a cada hora
    0 * * * * docker compose -f docker-compose.prod.yml exec -T web python manage.py verificar_prazos
"""

from django.core.management.base import BaseCommand
from django.db.models import Max
from django.utils import timezone

from apps.acoes.models import PlanoAcao
from apps.contas.models import Loja
from apps.estoque.models import SnapshotEstoque
from apps.notificacoes.eventos import ACAO_ATRASADA, ESTOQUE_DESATUALIZADO, publicar
from apps.publico.services import configuracao


class Command(BaseCommand):
    help = "Publica eventos de ação atrasada e estoque desatualizado (padrão Observer)."

    def handle(self, *args, **opts):
        hoje = timezone.localdate()
        agora = timezone.now()
        total = 0
        for loja in Loja.objects.all():
            for p in PlanoAcao.objects.da_loja(loja).filter(situacao="aberta", prazo__lt=hoje):
                publicar(
                    ACAO_ATRASADA, loja, chave=f"plano:{p.pk}", titulo=p.titulo,
                    responsavel=p.responsavel, prazo=p.prazo.strftime("%d/%m"), link=f"/acoes/{p.pk}",
                )  # fmt: skip
                total += 1
            ultimo = SnapshotEstoque.objects.da_loja(loja).aggregate(m=Max("capturado_em"))["m"]
            if ultimo:
                horas = int((agora - ultimo).total_seconds() // 3600)
                if horas > configuracao(loja).b_max_horas_estoque:
                    publicar(ESTOQUE_DESATUALIZADO, loja, chave="estoque", horas=horas)
                    total += 1
        self.stdout.write(self.style.SUCCESS(f"{total} evento(s) publicado(s)"))
