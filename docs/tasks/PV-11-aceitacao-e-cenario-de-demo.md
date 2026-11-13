# PV-11 · Testes de aceitação do pós-venda e cenário da demo

**Dono:** Pessoa 2 (testes) + todos (ensaio) · **Prioridade:** P1 · **Estimativa:** 4 h · **Depende de:** PV-01, PV-03, PV-04, PV-06 e PV-07 (vá escrevendo à medida que elas entram)

## Problema

Os critérios do [docs/10 §10](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#10-critérios-de-aceitação-viram-testes-na-pv-11) só valem se forem testes que rodam no CI. A demo precisa de um roteiro que funcione sempre, com dados fictícios.

## Onde mexer

- `apps/agente/tests/test_aceitacao_posvenda.py` (novo)
- `apps/core/management/commands/seed_demo.py`: cenário "boné preto"
- `docs/demo/` (novo): arquivos CSV fictícios + `ROTEIRO.md`

## Passo a passo

1. **Um teste por critério,** com o nome do critério (é fácil de ler no relatório):
   ```python
   @pytest.mark.django_db
   class TestAceitacaoPosVenda:
       def test_reimportar_mesmo_pedido_nao_duplica_proposta(self, ...): ...
       def test_cancelamento_invalida_proposta_pendente(self, ...): ...
       def test_venda_sem_cliente_nao_e_ligada_por_suposicao(self, ...): ...
       def test_outra_loja_nao_ve_interesse_nem_proposta(self, ...): ...
       def test_saldo_velho_nao_e_disponibilidade(self, ...): ...
       def test_tamanho_desconhecido_nao_vira_seu_tamanho(self, ...): ...
       def test_sem_consentimento_nao_gera_contato(self, ...): ...
       def test_interesse_encerrado_nao_gera_retorno(self, ...): ...
       def test_abrir_whatsapp_nao_marca_enviada(self, ...): ...
       def test_conversao_por_produto_e_categoria(self, ...): ...
   ```
   Se a feature ainda não entrou, use `pytest.param(..., marks=pytest.mark.xfail(strict=True, reason="PV-09"))`, como na P2-03. Quando a feature entrar, o teste passa a falhar até você tirar a marca.
2. **Seed:** crie a opção nova `seed_demo --cenario posvenda` (hoje só existem `--reset` e `--semente`). O cenário tem:
   - catálogo com Bonés (preto, U) e Camisetas (P, M, G, com saldo de hoje);
   - a relação "Bonés → Camisetas, complementar, 'look casual'";
   - cliente fictício com consentimento e tamanho M;
   - um segundo cliente **sem tamanho**, para mostrar a pendência.

   **Só nomes e telefones fictícios** (padrão do seed atual).
3. **Arquivos** em `docs/demo/`. O `.gitignore` bloqueia `*.csv` de propósito. Adicione a exceção `!docs/demo/*.csv` e revise cada arquivo antes do commit: só dados fictícios. Arquivos:
   - `catalogo.csv`;
   - `vendas-bone-preto.csv`;
   - `vendas-bone-preto-cancelada.csv`;
   - `estoque-hoje.csv`.
4. **`docs/demo/ROTEIRO.md`:** a fala de cada passo, com tempo estimado. Siga o [docs/10 §11](../10-POS-VENDA-E-ADEQUACAO-A-PESQUISA.md#11-demonstração). A frase obrigatória é: "entrada por arquivo, dados fictícios".
5. **Ensaio:** a equipe roda o roteiro 2 vezes, no ambiente publicado, antes da apresentação.

## Pronto quando

- [ ] Existem 10 testes de aceitação no CI (passando, ou `xfail` estrito com a task citada).
- [ ] O cenário do seed sobe com 1 comando.
- [ ] O roteiro foi ensaiado e os arquivos CSV fictícios estão versionados.
