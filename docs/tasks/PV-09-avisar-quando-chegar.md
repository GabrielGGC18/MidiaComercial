# PV-09 · "Avisar este cliente quando chegar" (procura → retorno)

**Dono:** Pessoa 1 (backend) + Pessoa 3 (balcão, junto com a UX-03) · **Prioridade:** P2 (entra se der tempo no hackathon) · **Estimativa:** 1 dia · **Depende de:** PV-03 e PV-07 (reaproveita o `posvenda`)

## Problema

A `DemandaNaoAtendida` (`apps/publico/models.py`) é **anônima de propósito**: não tem cliente. Isso está certo para a análise. Mas o atendimento que não virou venda se perde, porque não há como avisar a pessoa quando a calça 42 chegar.

## Onde mexer

- `apps/clientes/models.py`: `InteresseProduto`
- `apps/clientes/services.py` + `api.py`
- `apps/agente/posvenda.py`: `processar_reposicao()`
- `apps/importacao/services.py`: publicar `ESTOQUE_RECEBIDO` ao confirmar o estoque
- `apps/core/permissoes.py`: revisar quem pode criar interesse

## Passo a passo

1. **Modelo** (separado da demanda; o vínculo é opcional):
   ```python
   class InteresseProduto(ModeloDaLoja):
       class Status(models.TextChoices):
           AGUARDANDO = "aguardando"; CONTATADO = "contatado"; CONCLUIDO = "concluido"
           CANCELADO = "cancelado"; EXPIRADO = "expirado"

       cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="interesses")
       demanda = models.ForeignKey("publico.DemandaNaoAtendida", null=True, blank=True, on_delete=models.SET_NULL)
       produto = models.ForeignKey("comercio.Produto", null=True, blank=True, on_delete=models.SET_NULL)
       variante = models.ForeignKey("comercio.Variante", null=True, blank=True, on_delete=models.SET_NULL)
       produto_texto = models.CharField(max_length=160, blank=True)
       cor = models.CharField(max_length=40, blank=True)
       tamanho = models.CharField(max_length=10, blank=True)
       status = models.CharField(max_length=12, choices=Status.choices, default=Status.AGUARDANDO)
       expira_em = models.DateField()          # padrão: hoje + 30 dias
       ultimo_contato_em = models.DateTimeField(null=True, blank=True)
       pedido_atendido = models.ForeignKey("comercio.Pedido", null=True, blank=True, on_delete=models.SET_NULL)
       registrado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="+")
   ```
2. **Permissões (decisão explícita):** hoje, cadastrar e confirmar cliente é coisa de **gerente** (`apps/agente/services.py:36`, `apps/clientes/api.py`). Proposta:
   - o **atendente** pode criar um interesse para um cliente **existente**, ou fazer o cadastro mínimo (nome + WhatsApp + consentimento **dito em voz alta pelo cliente**, com o campo `consentimento_origem="balcao"`);
   - o **atendente** não lista a base nem exporta.

   Escreva isso na API (`loja_com_papel(request, "atendente")` só nesses endpoints) e teste o 403 nos outros.
3. **API:**
   - `POST /api/clientes/interesses` (atendente+);
   - `GET /api/clientes/{id}/interesses` (gerente+);
   - `POST /api/clientes/interesses/{id}/cancelar`.
4. **Reposição:** no `confirmar()` do lote de estoque, publique `ESTOQUE_RECEBIDO`. O observer chama `processar_reposicao(loja, lote)`:
   - para cada interesse `aguardando` e não expirado cujo item agora tem saldo > 0 e fresco, gera uma proposta `CONTATO` com `campanha.gatilho="reposicao"`;
   - a chave de idempotência é `reposicao:{interesse.id}:{lote.id}`;
   - a mensagem é **"chegou a calça 42. Ainda tem interesse?"**, sem prometer reserva.
5. **Ciclo:**
   - a proposta enviada leva o interesse a `contatado`;
   - uma compra do cliente nesse item ou categoria leva a `concluido`, com `pedido_atendido`;
   - o comando `verificar_prazos` marca `expirado` depois de `expira_em`.

## Como testar

- **Reposição:** com um interesse aguardando e um estoque importado com saldo, sai 1 proposta. Reimportar o mesmo estoque não gera outra.
- **Interesse encerrado:** cancelado, expirado ou concluído não gera proposta.
- **Permissões:** o atendente cria o interesse; o atendente em `GET /api/clientes/` recebe 403.
- **Isolamento:** um interesse de outra loja dá 404.

## Pronto quando

- [ ] O interesse tem o ciclo completo e uma migração.
- [ ] A reposição gera a proposta sem duplicar.
- [ ] A permissão do atendente está explícita na API e nos testes.
- [ ] No balcão, existe a opção "Avisar quando chegar" (UX-03).
