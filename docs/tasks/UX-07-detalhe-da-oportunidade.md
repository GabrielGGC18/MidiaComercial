# UX-07 · Detalhe da oportunidade: decisão primeiro, sem repetição e sem jargão

**Dono:** Pessoa 3 (tela) + Pessoa 2 (campos no backend) · **Prioridade:** P1 · **Estimativa:** 6 h front + 2 h back · **Depende de:** UX-02 (termos)

## Problema

Gaveta de detalhe da oportunidade (`frontend/src/features/oportunidades/dialogs.tsx`, `DetalheDialog`, linha ~133). Exemplo real, da regra A, "Calça jeans Azul 42":

```
Lacuna de mix
Investigar reposição: Calça jeans Azul 42
Dados suficientes
Por que estamos sugerindo isso
  Sugerimos isso porque 6 procuraram e não tinha; saldo informado = 0, atualizado há 20 h.
  Os dados são suficientes para essa leitura. Próximo passo: conferir estoque físico e
  consultar fornecedor antes de comprar. Atenção: são 6 atendimentos, não 6 compradores...
Evidência
  Balcão · 6 procuraram e não tinha · 27/10–07/11 · 6 registros
  Estoque · Saldo informado = 0, atualizado há 20 h · 13–13/11 · 1 registro
Limitação: São 6 atendimentos, não 6 compradores únicos nem 6 vendas garantidas.
Como medir: Novos registros de falta para CJE-AZ-42 nos próximos 7 dias
Regra A_LACUNA_MIX · Versão 1.0 · Prioridade 2º · Origem demanda, estoque
[Criar ação]
```

O que está errado:

1. **Tudo repetido:**
   - o parágrafo "Por que" (montado por `apps/inteligencia/explicacao/template.py`) junta as evidências, o status, o próximo passo e a limitação num texto só;
   - a evidência aparece de novo logo abaixo;
   - a limitação aparece **2 vezes**: no "Atenção:" e no bloco "Limitação".
2. **A decisão fica escondida.** O lojista quer saber em 5 segundos **o que fazer e por quê**. O "próximo passo" está no meio de um parágrafo de 4 frases.
3. **Jargão interno na tela:**
   - "Lacuna de mix", `A_LACUNA_MIX`, "Versão 1.0", "Prioridade 2º", "Origem: demanda, estoque";
   - o SKU `CJE-AZ-42` no "Como medir";
   - "Saldo informado = 0" (sinal de igual é notação de programador).
4. **Bug de data:** `periodo()` em `frontend/src/lib/format.ts:26` mostra **"13–13/11"** quando o início e o fim caem no mesmo dia. Deveria ser "13/11".
5. **Selo ambíguo:** "Dados suficientes" não diz suficiente para quê, nem com que limite. O estoque tem 20 h e o limite da loja é `b_max_horas_estoque` (72 h), mas a tela não mostra isso.
6. **Detalhe útil que não aparece:**
   - os motivos (`alvo.motivos`: quantas vezes foi "sem estoque" e quantas "sem tamanho/cor");
   - os dias em que as procuras aconteceram;
   - se **outras cores ou tamanhos do mesmo produto** têm estoque, ou seja, uma alternativa para oferecer hoje.
7. **Uma ação só.** Só existe "Criar ação". Faltam:
   - "O estoque está errado / já repus", que manda importar o estoque ou descartar com motivo;
   - "Lembrar depois";
   - e, quando a PV-09 existir, "Avisar quem procurou".
8. **"Como medir" vago:** não diz quem mede nem onde o resultado vai aparecer.

## Onde mexer

- `frontend/src/features/oportunidades/dialogs.tsx` (`DetalheDialog`)
- `frontend/src/components/midia/oportunidade.tsx` (`EvidenceList`)
- `frontend/src/lib/format.ts` (`periodo`) + teste
- `apps/inteligencia/regras/base.py` e as regras A, B e C: campos estruturados
- `apps/inteligencia/api.py` (`OportunidadeOut`)
- `apps/inteligencia/explicacao/template.py`: parar de repetir a limitação

## Passo a passo

### 1. Corrigir `periodo()` (15 min, faça primeiro)

```ts
export function periodo(ini: string, fim: string) {
  const a = asDate(ini), b = asDate(fim);
  if (format(a, "yyyy-MM-dd") === format(b, "yyyy-MM-dd")) return format(b, "dd/MM");
  if (format(a, "yyyy-MM") === format(b, "yyyy-MM")) return `${format(a, "dd")}–${format(b, "dd/MM")}`;
  return `${format(a, "dd/MM")}–${format(b, "dd/MM")}`;
}
```

O teste no Vitest cobre 3 casos: mesmo dia, mesmo mês e meses diferentes. Para o estoque, prefira a hora relativa: "contado ontem às 18h". `capturado_em` já tem a hora.

### 2. Backend: campos estruturados, sem texto colado

Acrescente em `OportunidadeCandidata` e no `OportunidadeOut` (sem quebrar o `explicacao`, que a IA pode reescrever):

```python
resumo: str                 # 1 frase: "6 clientes procuraram e a loja está sem estoque."
numeros: list[dict]         # [{"rotulo": "procuras sem estoque", "valor": 6},
                            #  {"rotulo": "em estoque", "valor": 0, "detalhe": "contado há 20 h"}]
passos: list[str]           # ["Conferir o estoque físico", "Consultar o fornecedor antes de comprar"]
alternativas: list[dict]    # regra A: variantes do MESMO produto com saldo > 0 e fresco
                            # [{"rotulo": "Calça jeans Azul 44", "saldo": 3}, ...]
frescor: dict               # {"horas": 20, "limite_horas": 72, "ok": true}
```

- **Regra A:** leia `alvo.motivos` para montar os números ("4 sem estoque · 2 sem tamanho/cor").
- **Alternativas:** saem de `Variante.objects.da_loja(loja).filter(produto=variante.produto)` com o saldo de `saldos_atuais`. Fica **vazio** se o saldo estiver velho; nunca invente.
- **Template:** `template.py` deixa de acrescentar "Atenção: {limitação}". A limitação tem bloco próprio.
- **Medição:** `medicao_sugerida` fica em linguagem de loja e sem SKU ("Se repuser, as procuras sem estoque dessa calça devem cair. Acompanhamos por 7 dias no Plano de ação."). Use o `rotulo`, nunca o `sku`.

### 3. Tela nova, em ordem de decisão

```
┌ Repor Calça jeans Azul 42?                        [✓ Dados confiáveis]
│ 6 clientes procuraram e a loja está sem estoque.          ← resumo
│
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐
│  │    6     │ │    0     │ │ contado há 20 h  │           ← números grandes
│  │ procuras │ │ em estoque│ │ limite: 72 h ✓  │
│  └──────────┘ └──────────┘ └──────────────────┘
│
│ O que fazer                                               ← passos (checklist)
│  ☐ Conferir o estoque físico
│  ☐ Consultar o fornecedor antes de comprar
│
│ Para oferecer hoje: Calça jeans Azul 44 (3) · Preta 42 (2) ← alternativas, se houver
│
│ ⚠ São 6 atendimentos, não 6 compradores nem 6 vendas.    ← limitação, UMA vez
│
│ [Criar ação]  [Estoque errado / já repus]  [Lembrar depois]
│
│ ▸ Ver detalhes                                            ← recolhido por padrão
│     De onde veio: Balcão 27/10–07/11 (6) · Estoque 13/11 18h (1)
│     4 sem estoque · 2 sem tamanho/cor · gráfico por dia
│     Como vamos medir: …
│     Informações técnicas: regra, versão, prioridade
└
```

- **Selo:**
  - "Dados suficientes" vira **"Dados confiáveis"**: ícone de check, com o *tooltip* "estoque dentro do limite de 72 h e 5 procuras ou mais";
  - "Amostra limitada" vira **"Confira antes de agir"**, com ícone de alerta e o motivo.
- **Sobretítulo:** "Lacuna de mix" vira **"Falta no estoque"**. Use o glossário da UX-02 (`regra_nome` → rótulo de loja; crie o mapa no front).
- **"Estoque errado / já repus":** abre uma escolha com 2 caminhos:
  - "Importar estoque atualizado" → `/importar`;
  - "Descartar: já resolvi", que usa o `DescartarDialog` com a justificativa pré-preenchida.
- **"Lembrar depois":** esconde por 3 dias. Precisa de endpoint `POST /api/oportunidades/{id}/adiar`, ou guarde em `dados`; combine com a Pessoa 2.
- **"Ver detalhes":** usa `<details>` ou Radix Collapsible. Os dados técnicos (`regra`, `versao_regra`, `prioridade`, fontes) ficam **só** aqui, sob "Informações técnicas", para auditoria.
- **Gráfico por dia:** barras simples com as procuras dos últimos 14 dias. Precisa de `evidencias[].serie`, ou de um endpoint pequeno. Se não der tempo, deixe para depois.
- **Celular:** a gaveta ocupa a tela inteira abaixo de `md`, com as ações num rodapé fixo e alvos de 44 px.

### 4. Aplicar nas outras regras

Os campos `resumo`, `numeros`, `passos` e `frescor` valem para as regras B (pouca saída) e C (concentração). Cada regra preenche os seus. `alternativas` é só da A.

## Como testar

- **Vitest:**
  - `periodo("2026-11-13", "2026-11-13") === "13/11"`;
  - a limitação aparece **uma** vez;
  - os dados técnicos ficam escondidos até abrir "Ver detalhes".
- **pytest:**
  - a regra A devolve `alternativas` só com saldo > 0 e fresco;
  - `medicao_sugerida` não contém SKU;
  - o template não repete a limitação.
- **Teste de 5 segundos:** mostre a gaveta a alguém de fora por 5 s e pergunte "o que a loja deve fazer?". A pessoa precisa responder "conferir estoque e falar com o fornecedor".
- **Responsivo:** 375 e 1280 px, nos temas claro e escuro.

## Pronto quando

- [ ] A data do mesmo dia mostra "13/11".
- [ ] Resumo, números e passos aparecem antes de qualquer texto longo.
- [ ] A limitação aparece uma vez só.
- [ ] Nenhum código interno (regra, SKU, versão) aparece fora de "Informações técnicas".
- [ ] As alternativas de cor e tamanho com estoque aparecem quando existem.
- [ ] As ações "Estoque errado / já repus" e "Lembrar depois" funcionam.
- [ ] As regras B e C também preenchem os campos novos.
