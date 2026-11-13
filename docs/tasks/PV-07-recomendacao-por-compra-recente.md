# PV-07 · Recomendação por compra recente (gatilho automático e sem duplicar)

**Dono:** Pessoa 2 · **Prioridade:** P1 (núcleo da demo) · **Estimativa:** 1 dia · **Depende de:** PV-03 e PV-06; PV-05 é desejável

## Problema

Hoje o agente só propõe contato quando alguém pede no chat ou clica em "prospecção", e só para **produto parado** ou **categoria em queda** (`apps/agente/prospeccao.py`). A pesquisa pede o contrário: **a venda recebida gera sozinha** uma sugestão de pós-venda, como "comprou boné preto → oferecer camiseta".

## Onde mexer

- `apps/agente/recomendacoes.py` (novo): escolhe os produtos elegíveis
- `apps/agente/posvenda.py` (novo): recebe o gatilho e gera as propostas sem duplicar
- `apps/agente/models.py`: `ProcessamentoPosVenda`; `PropostaAgente.pedido_origem`
- `apps/agente/observadores.py` (novo) + `apps/agente/apps.py` (`ready()`)
- `apps/notificacoes/eventos.py`: tipo `VENDA_RECEBIDA`
- `apps/importacao/services.py`: publicar o evento no `confirmar()`

## Passo a passo

### 1. Modelos

```python
class ProcessamentoPosVenda(ModeloDaLoja):
    class Status(models.TextChoices):
        FEITO = "feito", "Feito"
        SEM_SUGESTAO = "sem_sugestao", "Sem sugestão"
        FALHOU = "falhou", "Falhou"

    # "compra:csv:V001:<versao_hash>": loja + origem + registro + versão
    chave = models.CharField(max_length=120)
    status = models.CharField(max_length=14, choices=Status.choices)
    motivo = models.CharField(max_length=200, blank=True)   # por que não sugeriu / erro resumido
    tentativas = models.PositiveSmallIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["loja", "chave"], name="posvenda_chave_unica")]
```

Em `PropostaAgente`, adicione `pedido_origem = FK("comercio.Pedido", null=True, blank=True, on_delete=SET_NULL)`. A PV-04 usa esse campo para invalidar a proposta quando a compra é cancelada.

### 2. `recomendacoes.py`: regra pura, fácil de testar

```python
@dataclass
class Opcao:
    variante: Variante
    saldo: int
    capturado_em: datetime
    tipo: str            # complementar | semelhante
    justificativa: str   # da RelacaoProduto
    tamanho_confirmado: bool

def opcoes_para_compra(loja, pedido, cliente) -> tuple[list[Opcao], list[str]]:
    """Até 3 opções + lista de limitações legíveis. Não grava nada."""
```

Regras, cada uma com um teste:

1. Destinos vêm das `RelacaoProduto` **ativas** cuja origem é o produto ou a categoria comprada.
2. Exclui o mesmo produto-pai da compra.
3. Só saldo > 0 e **fresco**: `capturado_em` dentro de `ConfiguracaoLoja.b_max_horas_estoque`. Use `apps.publico.services.saldos_atuais`. Saldo velho fica fora e vira limitação ("estoque de 5 dias atrás: confira").
4. **Tamanho:** só se o cliente tiver tamanho cadastrado e a variante tiver o mesmo `tamanho`. Se a categoria de destino usa tamanho e o do cliente é desconhecido, a opção entra com `tamanho_confirmado=False` e a limitação "tamanho do cliente desconhecido".
5. Prefere `complementar` a `semelhante`, depois o maior saldo. Corta em 3.

### 3. `posvenda.py`: idempotente

```python
def processar_compra(loja, pedido, usuario) -> ProcessamentoPosVenda:
    chave = f"compra:{pedido.sistema_origem}:{pedido.pedido_id_origem}:{pedido.versao_hash}"
    try:
        with transaction.atomic():
            proc = ProcessamentoPosVenda.objects.create(loja=loja, chave=chave, status="feito")
    except IntegrityError:
        return ProcessamentoPosVenda.objects.get(loja=loja, chave=chave)   # já processado: não repete
    ...
```

**Elegibilidade.** Grave `SEM_SUGESTAO` com o motivo quando:
- o pedido não estiver `concluida`;
- não houver cliente (via `cliente_ref` ou `VinculoCliente`);
- o cliente não tiver consentimento ou WhatsApp;
- o cliente estiver em descanso (`DESCANSO_DIAS`);
- não houver opção.

**Gerar a proposta:**
- crie uma `Campanha` com `gatilho="compra_recente"` e `alvo={pedido, opcoes:[sku,...]}`;
- crie **uma** `PropostaAgente` `CONTATO` por cliente, com:
  - `pedido_origem`;
  - `motivos` (ex.: "Comprou Boné Preto em 12/11"; "Camiseta combina: look casual");
  - `limitacao`;
  - `campos_incertos`;
  - a mensagem.
- `criado_por` é o usuário que confirmou a importação.

**Mensagem:** siga as regras da PV-01 (sem "separamos"; tamanho só se confirmado).

### 4. Gatilho pelo Observer

- Em `eventos.py`, crie `VENDA_RECEBIDA = "venda_recebida"` e inclua o tipo em `TIPOS`.
- No `confirmar()` da importação, publique **um** evento por lote: `publicar(VENDA_RECEBIDA, loja, chave=f"lote:{lote.pk}", lote=lote.pk, usuario=usuario.pk)`.
- Em `apps/agente/observadores.py`:
  ```python
  @observa(VENDA_RECEBIDA)
  def gerar_posvenda(evento):
      for pedido in pedidos_do_lote_com_cliente(evento.loja, evento.dados["lote"]):
          processar_compra(evento.loja, pedido, usuario)
  ```
- Registre o observer em `AgenteConfig.ready()`, como faz `apps/notificacoes/apps.py`.
- **Limitação a documentar:** o observer roda no mesmo processo, depois do commit. Uma falha vira `FALHOU` no `ProcessamentoPosVenda` (com `tentativas`). Não é fila durável: o reprocessamento é manual, com `python manage.py reprocessar_posvenda --loja X` (crie o comando).

### 5. Aviso

Publique `CAMPANHA_PROPOSTA` (o tipo já existe) com `rotulo="Pós-venda"`, para o sino mostrar "N sugestões de pós-venda".

## Como testar

- **Cenário da demo:** com o boné preto comprado e a relação "Bonés → Camisetas", sai 1 proposta com até 3 camisetas em estoque.
- **Mesmo lote:** processar duas vezes não cria uma segunda proposta.
- **Sem consentimento:** cliente sem consentimento recebe `SEM_SUGESTAO`, e o motivo diz isso.
- **Saldo velho:** a opção fica fora e vira limitação.
- **Tamanho desconhecido:** a mensagem não diz "seu tamanho" e `campos_incertos` inclui `tamanho`.
- **Isolamento:** a relação da loja A não gera proposta na loja B.

## Pronto quando

- [ ] Confirmar uma importação de vendas gera as propostas de pós-venda sem clique extra.
- [ ] O processamento é idempotente e tem chave única.
- [ ] Cada proposta mostra o motivo, o saldo com a data e as limitações.
- [ ] Existe o comando de reprocessamento.
- [ ] O cenário de ponta a ponta tem teste (usado na PV-11).
