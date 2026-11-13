# P2-01 · API de conversas do agente (base do novo chat)

**Dono:** Pessoa 2 · **Prioridade:** P1 · **Estimativa:** 4 h · **Depende de:** nada · **Bloqueia:** P3-04 (chat)

## Contexto

O novo chat (P3-04, no estilo do Midia63) precisa de:

- **Histórico de conversas** no menu ⋮: listar e reabrir conversas antigas.
- **Nova conversa** e **apagar conversa**.
- **Transcrição completa** da conversa ao reabrir, com as propostas de cada resposta e os **passos**, isto é, as ferramentas que o agente usou ("Buscou no catálogo › Preparou registro").

Hoje já existe:

- `SessaoAgente.historico`: guarda **só as últimas 6 falas** (`MIDIA_AGENTE_HISTORICO`), porque essa é a janela enviada ao LLM. Isso serve para o LLM, mas não para mostrar a conversa inteira.
- `POST /api/agente/mensagens` com `sessao_id`, para continuar a conversa.
- `ChamadaFerramenta` com a `sessao` de cada chamada.

## Decisão

- Separar **o que guardamos** (até 100 falas) de **o que vai ao LLM** (as últimas 6).
- Cada fala do agente no histórico ganha `propostas` (lista de ids) e `passos` (nomes das ferramentas).
- O provedor recebe só `role` e `content`. A API da Anthropic rejeita campos extras na mensagem.

## Onde mexer

- `apps/agente/orquestrador.py`
- `apps/agente/api.py`
- `config/settings/base.py`
- `apps/agente/tests/test_conversas.py` (novo)
- `frontend/src/api/types.ts`: tipos para a Pessoa 3 usar

## Passo a passo

1. **Settings:** `MIDIA_AGENTE_HISTORICO_GUARDADO = 100`.
2. **Orquestrador:**
   - Guarde os passos desta mensagem. Dentro de `chamar`, depois de `obter`, faça `passos_nomes.append(nome)`.
   - Monte a janela do LLM só com as chaves aceitas:
     ```python
     n = settings.MIDIA_AGENTE_HISTORICO
     janela = [{"role": m["role"], "content": m["content"]} for m in sessao.historico[-n:]] if n else []
     resposta = provedor.executar(ctx, mascarado, chamar, janela)
     ```
     > A janela tem que começar com `role == "user"`. Como sempre gravamos em pares (usuário, agente), um `n` par garante isso. Escreva um teste para isso.
   - Grave a fala com os extras:
     ```python
     historico = [
         *sessao.historico,
         {"role": "user", "content": fala, "em": timezone.now().isoformat()},
         {"role": "assistant", "content": resposta or "-", "em": timezone.now().isoformat(),
          "propostas": [p.id for p in ctx.propostas], "passos": passos_nomes},
     ]
     sessao.historico = historico[-settings.MIDIA_AGENTE_HISTORICO_GUARDADO:]
     ```
   - **Privacidade:**
     - O histórico guarda o texto **mascarado** (`[TELEFONE_1]`), nunca o original. Mantenha assim.
     - Na tela, a pessoa vê o mascarado nas falas antigas. É aceitável e mais seguro.
     - O cadastro de cliente continua gravado como `[cadastro de cliente tratado localmente]`.
3. **API: listar conversas** (só as minhas, desta loja):
   ```python
   class ConversaResumo(Schema):
       id: int
       titulo: str          # primeira fala do usuário, cortada em 60 caracteres
       turnos: int
       atualizado_em: datetime
       provedor: str

   @router.get("/conversas", response=list[ConversaResumo])
   def conversas(request):
       loja = loja_com_papel(request, "atendente")
       qs = SessaoAgente.objects.da_loja(loja).filter(usuario=request.user, turnos__gt=0)
       return [
           {"id": s.id, "titulo": _titulo(s), "turnos": s.turnos,
            "atualizado_em": s.atualizado_em, "provedor": s.provedor}
           for s in qs.order_by("-atualizado_em")[:30]
       ]
   ```
   O `_titulo(s)` pega o primeiro item com `role == "user"` e corta em 60 caracteres. Se não houver, use `"Conversa"`.
4. **API: abrir uma conversa:**
   ```python
   class FalaOut(Schema):
       papel: Literal["voce", "agente"]
       texto: str
       em: datetime | None
       passos: list[str] = []
       propostas: list[PropostaOut] = []

   class ConversaOut(Schema):
       id: int
       falas: list[FalaOut]
   ```
   - Busque com `.da_loja(loja).filter(pk=id, usuario=request.user)`. Se não achar, devolva 404, inclusive para outra pessoa da mesma loja.
   - Para as propostas, junte os ids de todas as falas e faça **uma** query só:
     `PropostaAgente.objects.da_loja(loja).filter(id__in=ids).select_related("cliente")`.
   - Monte um dict `id → _p_out(p, tem_papel(request, "gerente"))`. Uma proposta apagada (fallback) simplesmente não aparece.
   - Traduza os passos para rótulos de loja, para a tela não mostrar nome técnico:
     ```python
     ROTULO_PASSO = {
         "buscar_variante": "Buscou no catálogo",
         "propor_demanda": "Preparou registro de procura",
         "propor_cliente": "Preparou cadastro de cliente",
         "buscar_clientes": "Buscou clientes",
         "prospectar_produtos_em_baixa": "Procurou produtos parados",
         "resumo_publico": "Leu o resumo do público",
     }
     ```
5. **API: apagar a conversa** (LGPD e "Limpar conversa"):
   ```python
   @router.delete("/conversas/{int:sessao_id}", response={204: None})
   def apagar(request, sessao_id: int):
       ...  # mesma busca do passo 4
       s.historico = []
       s.save(update_fields=["historico"])
       return 204, None
   ```
   - Apaga só o texto. A auditoria (`ChamadaFerramenta`) e as propostas **confirmadas** ficam: são registros da loja.
   - As propostas **pendentes** dessa sessão viram `rejeitada`.
   - Não liste conversa com histórico vazio: acrescente o filtro `.exclude(historico=[])` no passo 3.
6. **Resposta da mensagem:** inclua `passos: list[str]` (já como rótulo) no `MensagemOut`. Assim a tela mostra os passos na hora, sem reabrir a conversa.
7. **Tipos no front** (`types.ts`): `ConversaResumo`, `Fala` e `Conversa`. Avise a Pessoa 3 no PR.

## Testes obrigatórios

```python
def test_lista_so_minhas_conversas_da_loja(demo): ...
def test_abrir_conversa_traz_propostas_e_passos(demo): ...
def test_conversa_de_outra_pessoa_404(demo): ...      # dono.centro abre a do gerente.centro → 404
def test_conversa_de_outra_loja_404(demo): ...
def test_apagar_limpa_texto_e_rejeita_pendentes(demo): ...
def test_janela_do_llm_tem_so_role_e_content(demo, roteiro): ...  # use o Falso de test_provedor_claude.py
def test_guarda_100_mas_envia_6(demo, roteiro): ...
```

Reaproveite os fixtures `demo`, `_c`, `_msg` e `roteiro` de `apps/agente/tests/test_provedor_claude.py`. Para usar nos dois arquivos, mova esses fixtures para um `conftest.py` em `apps/agente/tests/`.

## Pronto quando

- [ ] `GET /conversas`, `GET /conversas/{id}` e `DELETE /conversas/{id}` funcionam, com isolamento por pessoa e por loja.
- [ ] O LLM recebe só `role` e `content`, no máximo 6 falas, sempre começando pelo usuário.
- [ ] Os passos aparecem com rótulo de loja.
- [ ] Os 7 testes passam, e o `pytest apps/agente` inteiro também.
- [ ] Os tipos estão no front.
