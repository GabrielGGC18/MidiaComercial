# PV-10 · Desfecho do contato e indicadores do piloto

**Dono:** Pessoa 2 (backend) + Pessoa 3 (tela) · **Prioridade:** P2 · **Estimativa:** 5 h · **Depende de:** PV-07 e PV-08

## Problema

- **Desfecho perdido:** depois do "enviada", o sistema não sabe o que aconteceu: se o cliente respondeu, recusou ou comprou.
- **Medição só por categoria:** `prospeccao.medir()` (linha ~258) olha compras **da categoria** em até 14 dias. Para pós-venda, o que importa é o **produto sugerido**.
- **Indicadores sem tela:** os indicadores do [docs/10 §9](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#9-indicadores-do-piloto) não têm onde aparecer.

## Onde mexer

- `apps/agente/models.py`: `PropostaAgente.desfecho` e `desfecho_em`
- `apps/agente/services.py`: `registrar_desfecho()`
- `apps/agente/prospeccao.py`: `medir()` com produto
- `apps/agente/api.py`: `POST /propostas/{id}/desfecho` e `GET /indicadores`
- Frontend: seletor de desfecho no cartão enviado + bloco "Resultados" no "Hoje" (UX-01)

## Passo a passo

1. **Desfecho:**
   ```python
   class Desfecho(models.TextChoices):
       SEM_RESPOSTA = "sem_resposta"; RESPONDEU = "respondeu"; INTERESSADO = "interessado"
       RECUSOU = "recusou"; PEDIU_SAIR = "pediu_sair"
   ```
   - **"Pediu para sair"** chama `clientes_services.revogar_consentimento()`. A LGPD vem primeiro.
   - **"Comprou"** não é desfecho manual: vem da venda importada (fato).
2. **Medição:** `medir()` recebe o nível, `"produto"` ou `"categoria"`.
   - Com `pedido_origem` + `alvo.opcoes`, olhe as compras das **variantes sugeridas** (ou do mesmo produto-pai).
   - Devolva os dois números e mantenha o texto de limitação ("associação, não causalidade").
3. **Indicadores:** `GET /api/agente/indicadores?dias=30` (gerente+):
   ```json
   {
     "vendas_com_cliente_pct": 62.5,
     "sugestoes": {"geradas": 40, "aprovadas": 22, "rejeitadas": 9, "motivos_rejeicao": {"nao_combina": 5}},
     "contatos": {"enviados": 18, "responderam": 7, "pediram_sair": 1},
     "compras_apos_contato": {"produto": 3, "categoria": 6},
     "limitacao": "Compra após contato mostra associação, não prova causa."
   }
   ```
   Monte só agregados, **sem dado pessoal**.
4. **Tempo de rotina:** para medir o esforço operacional, grave `decidido_em - criado_em` (já existem os dois campos) e mostre a mediana.

## Como testar

- **Pediu para sair:** revoga o consentimento, e o cliente some das próximas sugestões.
- **Medição:** uma compra da variante sugerida em 14 dias conta no "produto". Uma de outro produto da categoria conta só na "categoria".
- **Indicadores:** batem com um cenário montado no teste.

## Pronto quando

- [ ] O vendedor registra o desfecho em 1 toque no cartão enviado.
- [ ] A medição tem os níveis produto e categoria, com a limitação visível.
- [ ] O endpoint de indicadores e o bloco "Resultados" funcionam.
