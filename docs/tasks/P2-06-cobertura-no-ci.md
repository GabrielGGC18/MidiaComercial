# P2-06 · Cobertura de testes no CI e regras de código mais rígidas

**Dono:** Pessoa 2 · **Prioridade:** P2 · **Estimativa:** 2 h · **Depende de:** nada (melhor fazer por último, para medir com as tasks novas)

## Problema

- **Não sabemos o que está testado.** O CI roda o `pytest` (`.github/workflows/ci.yml`), mas sem cobertura: um módulo sem nenhum teste passa verde. O `pytest-cov` nem está instalado (`ModuleNotFoundError: No module named 'pytest_cov'`).
- **O ruff está no básico.** Não pega, por exemplo, `except Exception: pass` escondendo erro nem `print()` esquecido.

## Onde mexer

- `pyproject.toml` (extras `dev` e `[tool.ruff]`)
- `.github/workflows/ci.yml`
- o código que as regras novas apontarem

## Passo a passo

1. **Instale o pytest-cov.** Em `pyproject.toml`, `[project.optional-dependencies] dev`, adicione `"pytest-cov>=5"`. Depois rode `pip install -e ".[dev]"`.
2. **Meça antes de pôr meta.** Rode:
   ```bash
   pytest --cov=apps --cov-report=term-missing:skip-covered
   ```
   Anote o total, por exemplo 84%. A meta do CI é **o número atual arredondado para baixo**, nunca acima: o CI não pode nascer vermelho.
3. **Configure** no `pyproject.toml`:
   ```toml
   [tool.coverage.run]
   source = ["apps"]
   omit = ["*/migrations/*", "*/tests/*", "apps/core/demo.py"]

   [tool.coverage.report]
   fail_under = 80   # troque pelo número medido no passo 2
   show_missing = true
   skip_covered = true
   ```
   O `demo.py` fica de fora porque é seed: testar o seed infla o número sem proteger nada.
4. **No CI**, troque `- run: pytest` por:
   ```yaml
   - run: pytest --cov --cov-report=term --cov-report=xml
   ```
5. **Ruff mais rígido.** Em `[tool.ruff.lint]`, adicione estas regras ao `select` (confira o que já existe antes):
   - `"T20"`: proíbe `print`;
   - `"BLE"`: `except Exception` sem justificativa;
   - `"S"`: segurança (bandit);
   - `"DJ"`: boas práticas de Django.

   Rode `ruff check .` e trate cada caso:
   - **Corrija** o que for problema real.
   - Para o que for intencional, deixe `# noqa: BLE001 - motivo` com o motivo escrito. Já existe um padrão assim no `orquestrador.py`.
   - Nos testes, `S101` (assert) é normal. Ignore por arquivo:
     ```toml
     [tool.ruff.lint.per-file-ignores]
     "**/tests/**" = ["S101", "S106"]
     ```
6. **Liste os 3 módulos com menor cobertura** no PR e abra uma task nova para cada, se forem importantes (por exemplo, `apps/importacao/services.py`).

## Pronto quando

- [ ] O `pytest --cov` roda local e no CI, com `fail_under` igual à cobertura atual.
- [ ] O ruff tem `T20`, `BLE`, `S` e `DJ`, e o código está corrigido ou justificado.
- [ ] O CI está verde.
- [ ] O PR lista os 3 módulos com menor cobertura.
