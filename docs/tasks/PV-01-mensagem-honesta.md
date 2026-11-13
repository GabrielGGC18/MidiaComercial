# PV-01 · Mensagem de contato não promete reserva nem tamanho desconhecido

**Dono:** Pessoa 2 · **Prioridade:** P0 (bug) · **Estimativa:** 1 h · **Depende de:** nada

## Problema

Em `apps/agente/prospeccao.py`:

- **Reserva prometida:** `mensagem()` (linha ~157) escreve **"separamos {produto}"**. Ninguém separou nada.
- **Tamanho suposto:** quando o alvo tem tamanho, a mensagem diz **"no seu tamanho (M)"**. Só que `candidatos()` (linha ~131) só descarta o cliente se ele tiver tamanho cadastrado **diferente**. Cliente **sem tamanho cadastrado** passa e recebe "no seu tamanho (M)".
- **Origem frágil do tamanho:** o tamanho do alvo vem do sufixo do SKU (`CAM-AZ-M` → `M`, linha ~47). Isso será trocado na PV-03. Aqui, só não afirme o tamanho.

Fere os critérios do [docs/10 §10](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#10-critérios-de-aceitação-viram-testes-na-pv-11): "tamanho desconhecido não aparece como 'seu tamanho'".

## Onde mexer

- `apps/agente/prospeccao.py` (`candidatos`, `mensagem`)
- `apps/agente/tests/` (teste novo)

## Passo a passo

1. **Saiba se o tamanho foi confirmado.** Em `candidatos()`, quando o tamanho do cliente bate com o do alvo, anote isso no retorno. Sugestão: devolva uma tupla com 4 itens `(cliente, pontos, motivos, tamanho_confirmado)` e ajuste quem consome (`rodar`).
2. **Reescreva `mensagem()`** recebendo `tamanho_confirmado: bool`:
   ```python
   if alvo["sku"]:
       oferta = f"temos {alvo['rotulo']}"
       if tamanho_confirmado and alvo["tamanho"] not in ("", "U"):
           oferta += f" no tamanho {alvo['tamanho']}, que você costuma usar"
   ```
   - Troque "separamos" por "temos" ou "chegou".
   - A pergunta final pode continuar: "Quer que a gente guarde uma peça para você provar?". É pergunta, não promessa.
3. **Limitação visível.** Se o tamanho não foi confirmado, acrescente em `PropostaAgente.campos_incertos` o item `"tamanho"`. A UI já mostra os campos incertos no `PropostaCard`.

## Como testar

Escreva o teste primeiro:

```python
def test_mensagem_sem_tamanho_confirmado_nao_diz_seu_tamanho(loja, cliente_sem_tamanho):
    alvo = {"sku": "CAM-AZ-M", "rotulo": "Camiseta Azul M", "categoria": "Camisetas", "tamanho": "M"}
    txt = mensagem(loja, cliente_sem_tamanho, alvo, tamanho_confirmado=False)
    assert "seu tamanho" not in txt and "separamos" not in txt
```

Faça também o caso com o tamanho confirmado, que deve citar o "M".

## Pronto quando

- [ ] Nenhuma mensagem gerada contém "separamos".
- [ ] "Tamanho" só aparece na mensagem quando o tamanho foi confirmado no cadastro do cliente.
- [ ] Sem confirmação, `campos_incertos` inclui `tamanho`.
- [ ] `pytest apps/agente` passa.
