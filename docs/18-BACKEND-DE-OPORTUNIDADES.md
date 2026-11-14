# 18. Backend de oportunidades: análises imutáveis, recálculo idempotente e contrato da decisão

**Base:** proposta "Melhoria do backend e da experiência em /oportunidades" (13/11), conferida contra o código.
Este documento registra **o que foi implementado**, onde a proposta foi refinada e o que fica para depois.

## 1. Diagnóstico confirmado no código

| # | Problema | Onde estava | Situação |
| --- | --- | --- | --- |
| P0.1 | O GET do painel calculava e gravava quando não havia análise | `api.painel()` chamava `motor.gerar()` | ✅ corrigido |
| P0.2 | Recalcular **apagava** os cartões abertos da análise anterior (IDs sumiam) | `motor.gerar()` com `.delete()` | ✅ corrigido |
| P0.3 | Duas requisições simultâneas podiam publicar duas análises | sem trava nem chave | ✅ corrigido |
| P0.4 | A explicação (que pode chamar LLM) rodava dentro da transação | `@transaction.atomic` no `gerar()` inteiro | ✅ corrigido |
| P0.5 | Mensagem de contato prometia reserva ("separamos") e tamanho não confirmado | `prospeccao.mensagem()` | ✅ corrigido (PV-01) |
| extra | Confirmar uma proposta duas vezes ao mesmo tempo criava dois registros | `services.confirmar()` checava status fora da trava | ✅ corrigido |
| extra | Loja nova quebrava o motor (`Decimal < str` no limiar padrão) | `publico.services.configuracao()` | ✅ corrigido |

## 2. Como ficou

### 2.1 Análise = fotografia imutável

- `ExecucaoMotor` ganhou `revisao_dados`, `versao_motor`, `fontes` e `duracao_ms`.
- Recalcular cria **outra** execução. A anterior e seus cartões ficam (auditoria; detalhe aberto continua
  funcionando, com `da_analise_vigente: false`).
- **Vigente** = a execução mais recente da loja.

### 2.2 Revisão dos dados (`apps/inteligencia/revisao.py`)

Assinatura barata, só com agregados (contagem, maior id, maior data) de tudo que muda o resultado: pedidos e
itens, estoque, procuras, catálogo, configuração da loja, planos de ação, descartes e adiamentos, a janela e se o
estoque ainda está dentro do prazo. `VERSAO_MOTOR` sobe quando as regras mudam o resultado para os mesmos dados.

| Situação | Comportamento |
| --- | --- |
| `POST /gerar` com a mesma revisão da vigente | Devolve a mesma análise, `reaproveitada: true`. Nada é gravado |
| Dado novo (procura, importação, plano…) | `GET` mostra `execucao.desatualizada: true`; o próximo `POST` cria outra |
| Duas requisições iguais ao mesmo tempo | Publicação serializada por loja (`select_for_update` na `Loja`) + `UniqueConstraint(loja, revisao_dados, versao_motor)`. A segunda devolve a primeira |

### 2.3 Fluxo do cálculo (`motor.calcular`)

1. Calcula a revisão; se igual à vigente, devolve a vigente.
2. **Fora de transação:** monta o contexto, avalia as regras, prioriza, gera explicação (LLM opcional, com
   fallback para o template) e os campos estruturados.
3. **Transação curta:** trava a loja, confere se outra requisição já publicou a mesma revisão, grava a execução,
   os cartões e as evidências (em lote), publica os avisos.

O LLM só reescreve texto: números, elegibilidade e prioridade são das regras.

### 2.4 Identidade estável do alvo

`Oportunidade.chave` (`"A_LACUNA_MIX:CJE-AZ-42"`): SKU quando existe; senão o texto da procura, a categoria ou a
métrica. Nunca o título. Serve para:

- não repetir alvo com plano aberto/recente, descarte recente ou adiamento ativo;
- avisar "oportunidade nova" só quando o alvo não estava na análise anterior;
- **uma ação aberta por alvo**, mesmo com cartões do mesmo alvo em análises diferentes (409).

A migração `0003` preenche a chave dos cartões já existentes.

## 3. Contrato da API (aditivo)

Tudo que a tela já usava continua igual. Campos novos:

**`GET /api/oportunidades/`** (só lê) e **`POST /api/oportunidades/gerar`**

```json
{
  "estado": "pronto",
  "execucao": {
    "id": 215, "janela_inicio": "2026-10-15", "janela_fim": "2026-11-13",
    "executado_em": "2026-11-13T18:30:00Z", "revisao_dados": "9f2c…", "versao_motor": "2",
    "duracao_ms": 31, "desatualizada": false
  },
  "fontes": {
    "vendas": {"ultimo_pedido_em": "…", "pedidos": 820},
    "estoque": {"capturado_em": "…", "horas": 20.0, "limite_horas": 72, "recente": true},
    "demandas": {"ultimo_registro_em": "…"}
  },
  "tratadas": 1,
  "reaproveitada": false,
  "qualidade": {"…": "igual a antes"},
  "bloqueios": [],
  "cartoes": [{
    "…": "campos de antes",
    "execucao_id": 215,
    "chave": "A_LACUNA_MIX:CJE-AZ-42",
    "resumo": "6 registros de procura nesta janela e o saldo informado é zero.",
    "numeros": [
      {"rotulo": "registros de procura", "valor": "6", "unidade": "registros"},
      {"rotulo": "sem estoque", "valor": "4", "unidade": "registros"},
      {"rotulo": "sem o tamanho ou a cor", "valor": "2", "unidade": "registros"},
      {"rotulo": "saldo informado", "valor": "0", "unidade": "unidades", "detalhe": "contado há 20 h"}
    ],
    "passos": ["Conferir o estoque físico", "Consultar o fornecedor antes de comprar"],
    "alternativas": [{"sku": "CJE-AZ-44", "rotulo": "Calça jeans Azul 44", "saldo": 3}],
    "frescor": {"horas": 20.0, "limite_horas": 72, "ok": true},
    "adiada_ate": null,
    "estado_decisao": "aberta",
    "acoes_disponiveis": ["criar_acao", "descartar", "adiar"],
    "da_analise_vigente": true
  }]
}
```

- `estado: "sem_execucao"` (com `execucao: null`): loja nunca analisada → a tela oferece "Gerar primeira análise".
- `numeros[].valor` é **texto** (uma política só para inteiro e decimal).
- `alternativas`: outras cores/tamanhos do **mesmo produto** com saldo, **só** se o estoque estiver dentro do
  prazo. Estoque velho → lista vazia.
- Linguagem: "registros de procura" (não "clientes": não há deduplicação de pessoas) e "saldo informado" (não
  disponibilidade garantida). Medição sem SKU.

**`POST /api/oportunidades/{id}/adiar`** `{"dias": 3}` (1 a 14): "Lembrar depois". Some do painel e não volta num
recálculo antes do prazo. Auditado (`oportunidade_adiada`).

**`POST /api/agente/propostas/{id}/confirmar`** ganhou `atualizar` (ex.: `["demandas", "oportunidades",
"qualidade", "notificacoes"]`): a tela invalida essas consultas em vez de somar +1 por conta própria.

## 4. Refinamentos em relação à proposta

| Proposta | Decisão | Por quê |
| --- | --- | --- |
| Estado `processando/falhou` na execução e job assíncrono | **Não agora** | O cálculo leva ~30 ms na demo (medido) e a publicação é atômica: não existe análise "pela metade" para mostrar. Medir no piloto antes de criar fila (a própria proposta pede isso) |
| Tabela `DecisaoOportunidade` append-only | **Não agora**: a trilha usa `EventoAuditoria` (já existente) | Descarte e adiamento já são auditados; uma tabela nova duplicaria a trilha |
| `eventos` com revisão no retorno da confirmação | Só `atualizar` | É o que a tela precisa para invalidar; a revisão nova aparece no `GET` (`desatualizada`) |
| Execução "vigente" por ponteiro | Vigente = mais recente | Com publicação atômica e serializada, "a mais recente" já é a vigente; um ponteiro seria estado a mais para manter |
| Seed da demo | `seed_demo` gera a primeira análise | O GET não calcula mais; a demo continua abrindo pronta |

## 5. Ainda não feito (próximos passos)

| Ordem | Entrega | Task |
| --- | --- | --- |
| P1 | Tela usar os campos novos (decisão primeiro, números, passos, alternativas, "Lembrar depois") | UX-07 (front) |
| P1 | Correção e cancelamento de pedido na reimportação | PV-04 |
| P1 | Cor e tamanho resolvidos na importação | PV-03 |
| P1 | Fixture da apresentação com números reconciliados antes/depois | PV-11 |
| P2 | Job persistente, se o tempo medido no piloto exigir | — |
| P2 | Pós-venda por compra recente | PV-07 |
| P2 | Conector por fornecedor (SETA; "UNIX" a confirmar) | PV-12 |

## 6. Testes

- `apps/inteligencia/tests/test_snapshots.py`: GET não grava; recalcular sem mudança reaproveita; dado novo marca
  desatualizada e preserva a análise anterior; campos estruturados; adiar; uma ação por alvo entre análises;
  constraint de revisão; corrida no cálculo; loja nova.
- `apps/agente/tests/test_mensagem_honesta.py`: mensagem sem "separamos" e sem tamanho não confirmado;
  `campos_incertos` com `tamanho`; confirmar duas vezes gera um registro e devolve `atualizar`.
- Concorrência real entre processos depende do Postgres (CI e produção): a trava de linha não existe no SQLite;
  lá a constraint única cobre a corrida.
