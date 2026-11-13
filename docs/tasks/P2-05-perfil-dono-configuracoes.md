# P2-05 · Perfil dono: tela "Loja e equipe" (configurações, uso do agente)

**Dono:** Pessoa 2 (backend e frontend) · **Prioridade:** P1 · **Estimativa:** 1 dia · **Depende de:** P3-02 para pôr o item no menu sanduíche (pode começar antes)

## Problema

Logado como `dono.centro`, o dono vê **exatamente** as mesmas telas do gerente. O papel `dono` existe (`HIERARQUIA = {"atendente": 1, "gerente": 2, "dono": 3}`), mas nenhuma rota exige esse papel.

Também ficam sem tela:

- **Limiares das regras:** a `ConfiguracaoLoja` (`apps/contas/models.py`) diz no próprio docstring que eles são "editáveis, nunca fixos no código". Mas só dá para editar pelo `/admin`. São eles: janela de dias, mínimo de procuras da regra A, dias sem venda da regra B, idade máxima do estoque, concentração da regra C e cobertura de cliente.
- **Uso do agente:** o endpoint `GET /api/agente/uso` já existe (sessões, tokens, quedas para o offline), mas nenhuma tela o mostra.
- **Equipe:** quem tem acesso à loja e com qual papel.

## Escopo

Uma página `/loja`, **só para o dono**, com 3 blocos:

1. **Regras da loja:** formulário dos limiares, com explicação em linguagem de loja.
2. **Agente:** cartões com os números do `/api/agente/uso`.
3. **Equipe:** lista só de leitura dos vínculos (nome, papel). Convidar e remover gente fica para depois.

## Backend

### Onde mexer

`apps/contas/api.py`, `apps/contas/services.py` e os testes em `apps/contas/tests/`.

### Passo a passo

1. Schemas, com limites para ninguém gravar valor absurdo:
   ```python
   from decimal import Decimal
   from ninja import Field, Schema

   class ConfiguracaoIO(Schema):
       janela_dias: int = Field(..., ge=7, le=180)
       a_min_demandas: int = Field(..., ge=1, le=100)
       b_dias_sem_venda: int = Field(..., ge=7, le=180)
       b_max_horas_estoque: int = Field(..., ge=12, le=720)
       c_limiar_concentracao: Decimal = Field(..., ge=Decimal("0.05"), le=Decimal("0.95"))
       c_min_cobertura_cliente: Decimal = Field(..., ge=Decimal("0.05"), le=Decimal("1.00"))
   ```
   Dinheiro e proporção são sempre `Decimal`. Nada de `float` (regra do backend).
2. Rotas:
   ```python
   @router.get("/loja/configuracao", response=ConfiguracaoIO)
   def ver_configuracao(request):
       loja = loja_com_papel(request, "dono")
       cfg, _ = ConfiguracaoLoja.objects.get_or_create(loja=loja)
       return cfg

   @router.put("/loja/configuracao", response=ConfiguracaoIO)
   def salvar_configuracao(request, payload: ConfiguracaoIO):
       loja = loja_com_papel(request, "dono")
       return services.salvar_configuracao(loja, request.user, payload.dict())

   class MembroOut(Schema):
       nome: str
       papel: str

   @router.get("/loja/equipe", response=list[MembroOut])
   def equipe(request):
       loja = loja_com_papel(request, "dono")
       return [{"nome": v.user.get_full_name() or v.user.username, "papel": v.get_papel_display()}
               for v in loja.vinculos.select_related("user").order_by("papel")]
   ```
   > **A loja vem de `request.loja`, via `loja_com_papel`. Nunca da URL nem do body.** Não exponha e-mail na lista da equipe.
3. **Auditoria:** em `services.salvar_configuracao`, registre o antes e o depois. Use o `EventoAuditoria` de `apps/acoes/auditoria.py` se ele aceitar um evento genérico; senão, faça um `log.info`. Mudar limiar muda as oportunidades, então tem que dar para saber quem mudou.
4. **Recalcular:** depois de salvar, as oportunidades atuais foram calculadas com o limiar antigo. Devolva também um aviso ("Recalcule as oportunidades para aplicar"), ou chame o motor (`apps/inteligencia/motor.py`, função `gerar`). Escolha uma das duas e justifique no PR.

### Testes

- Gerente faz GET ou PUT → 403. Atendente → 403. Dono → 200.
- `janela_dias=3` → 422, com mensagem em português (o handler de `ValidationError` já traduz; confira).
- O dono da loja Centro não altera a configuração da loja Norte (a loja vem da sessão).
- O PUT persiste e o GET devolve o valor novo.

## Frontend

### Onde mexer

- `frontend/src/features/loja/LojaPage.tsx` (nova feature, que não importa de outras features)
- `frontend/src/app/router.tsx`
- o menu do `AppShell` (ou o menu sanduíche da P3-02)
- `frontend/src/api/types.ts`

### Passo a passo

1. **Rota protegida:** no `router.tsx`, crie um bloco com `<RequireLoja papel="dono" />` envolvendo `{ path: "/loja", element: s(<LojaPage />) }`, dentro do `AppShell`. Siga o padrão das linhas 37 a 49.
2. **Menu:** item "Loja e equipe" (ícone `Settings2`) no grupo "Dados", visível só com `temPapel(me?.papel, "dono")`.
3. **Formulário:** React Hook Form + Zod, com os mesmos limites do backend.
   - Cada campo tem um rótulo em linguagem de loja e uma ajuda visível, não em tooltip:
     | Campo | Rótulo | Ajuda |
     | --- | --- | --- |
     | `a_min_demandas` | "Procuras para virar oportunidade" | "Quantas vezes um item precisa ser procurado e não encontrado para o sistema sugerir reposição." |
     | `b_dias_sem_venda` | "Dias parado para virar alerta" | — |
     | `c_limiar_concentracao` | "Concentração de vendas" | Mostre em %: o input aceita 25 e o código envia 0.25. Converta no submit. |
   - Um único botão principal "Salvar regras" (`AcaoPrincipal`).
   - Depois de salvar: toast e o aviso de recalcular.
4. **Cartões do agente:** reaproveite o `KpiTile` de `components/midia`.
   - Mostre: mensagens, quantas usaram IA, quantas caíram no offline, tempo médio e o modelo.
   - Tokens com `Intl.NumberFormat("pt-BR")`.
   - Limitação visível (`LimitationNote`): "Tokens só contam quando a IA está ligada."
5. **Equipe:** uma lista simples com o nome e um `SignalBadge`, ou um rótulo com ícone para o papel.
6. **Estados obrigatórios:** carregando (skeleton), erro com "Tentar de novo", e um gerente que acesse `/loja` é redirecionado (o toast vem da P1-07).

## Pronto quando

- [ ] Os 3 endpoints existem, só para o dono, com testes de papel, de loja e de validação.
- [ ] A página `/loja` tem os 3 blocos, com explicações em linguagem de loja.
- [ ] O item de menu aparece só para o dono.
- [ ] Há prints em 375 px e 1280 px, nos temas claro e escuro.
