# P2-04 · Retenção (LGPD): comando `limpar_agente`

**Dono:** Pessoa 2 · **Prioridade:** P2 · **Estimativa:** 2 h · **Depende de:** P2-01 (o histórico passa a guardar até 100 falas)

## Problema

Três coisas guardam texto do agente para sempre:

- `SessaoAgente.historico` (falas mascaradas);
- `ChamadaFerramenta.entrada` (argumentos das ferramentas);
- `PropostaAgente.dados` (inclui nome e WhatsApp nas propostas de cliente rejeitadas).

A LGPD pede **necessidade** e **prazo**: dado que não serve mais deve sair. Nada limpa isso hoje.

## Regra proposta (confirme com o Gabriel no PR)

| O quê | Depois de | Ação |
| --- | --- | --- |
| Texto da conversa (`historico`) | 90 dias sem uso | esvazia (`[]`) |
| `ChamadaFerramenta` | 180 dias | apaga |
| Proposta **rejeitada** do tipo `cliente` | 30 dias | apaga |
| Proposta confirmada ou enviada | nunca, por aqui | é registro de negócio, ligado a `objeto_criado` e à medição de campanha |

## Onde mexer

- `apps/agente/management/commands/limpar_agente.py` (novo)
- `apps/agente/services.py` (função testável)
- agendamento: mesmo padrão da P1-05 (timer diário)

## Passo a passo

1. Ponha a lógica no service, não no comando, porque é mais fácil de testar:
   ```python
   from datetime import timedelta

   from django.db import transaction
   from django.utils import timezone

   from .models import ChamadaFerramenta, PropostaAgente, SessaoAgente

   @transaction.atomic
   def limpar(*, dias_conversa=90, dias_auditoria=180, dias_rejeitada=30, simular=False) -> dict:
       agora = timezone.now()
       conversas = SessaoAgente.objects.filter(
           atualizado_em__lt=agora - timedelta(days=dias_conversa)
       ).exclude(historico=[])
       chamadas = ChamadaFerramenta.objects.filter(criado_em__lt=agora - timedelta(days=dias_auditoria))
       rejeitadas = PropostaAgente.objects.filter(
           tipo="cliente", status="rejeitada",
           decidido_em__lt=agora - timedelta(days=dias_rejeitada),
       )
       resumo = {"conversas": conversas.count(), "chamadas": chamadas.count(),
                 "rejeitadas": rejeitadas.count()}
       if not simular:
           conversas.update(historico=[])
           chamadas.delete()
           rejeitadas.delete()
       return resumo
   ```
   - **Aqui não tem `.da_loja()`, de propósito:** é tarefa de manutenção que vale para todas as lojas, roda pelo `manage.py` e não tem request.
   - **`update()` não chama `save()`:** o `auto_now` do `atualizado_em` não muda, e é isso que queremos aqui.
2. O comando, com `--simular` para ver antes de apagar:
   ```python
   class Command(BaseCommand):
       help = "Apaga texto antigo do agente (LGPD). Use --simular para só contar."

       def add_arguments(self, p):
           p.add_argument("--simular", action="store_true")
           p.add_argument("--dias-conversa", type=int, default=90)

       def handle(self, *a, **o):
           r = limpar(dias_conversa=o["dias_conversa"], simular=o["simular"])
           prefixo = "Simulação: apagaria" if o["simular"] else "Apagado"
           self.stdout.write(f"{prefixo}: {r['conversas']} conversas, "
                             f"{r['chamadas']} chamadas, {r['rejeitadas']} propostas rejeitadas")
   ```
3. Cite a política no README, na seção "Privacidade", e no docs/07.
4. Agende para rodar todo dia, de madrugada: `OnCalendar=*-*-* 03:30`, no mesmo padrão da P1-05.

## Testes

- Uma conversa de 100 dias fica com o histórico vazio; uma de 10 dias fica igual.
  > Para envelhecer o registro, use `SessaoAgente.objects.filter(pk=s.pk).update(atualizado_em=...)`. O `save()` sobrescreve por causa do `auto_now`.
- Uma proposta de cliente rejeitada há 31 dias é apagada. Uma confirmada há 1 ano fica.
- `simular=True` não apaga nada e devolve as contagens certas.

## Pronto quando

- [ ] O service e o comando existem, com `--simular`.
- [ ] Os 3 testes passam.
- [ ] A política está documentada e o agendamento foi descrito.
- [ ] O Gabriel aprovou os prazos no PR.
