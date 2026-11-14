"""Gera a referência técnica a partir do código (docs/tecnico/referencia-*.md).

Uso: python manage.py gerar_referencia

Introspecção, não texto à mão: rotas da API com o papel mínimo, modelos e relações,
comandos de manutenção e configurações MIDIA_* (só nome e padrão do código, nunca o
valor do .env). Rode de novo sempre que mudar rota, modelo, comando ou setting.
"""

from __future__ import annotations

import importlib
import inspect
import re
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management import get_commands, load_command_class
from django.core.management.base import BaseCommand

PASTA = Path(settings.BASE_DIR) / "docs" / "tecnico"
ORDEM = {"atendente": 1, "gerente": 2, "dono": 3}
CABECALHO = (
    "> Gerado por `python manage.py gerar_referencia`. Não edite à mão: rode o comando de novo.\n\n"
)


def _fonte(f) -> str:
    try:
        return inspect.getsource(f)
    except (OSError, TypeError):
        return ""


def _papel(f, vistos: set | None = None) -> str | None:
    """Maior papel exigido pela função ou pelas auxiliares que ela chama (_buscar etc.)."""
    vistos = vistos if vistos is not None else set()
    if f in vistos:
        return None
    vistos.add(f)
    src = _fonte(f)
    papeis = [
        p or "atendente" for p in re.findall(r'loja_com_papel\(request(?:,\s*"(\w+)")?\)', src)
    ]
    mod = importlib.import_module(f.__module__)
    for nome in re.findall(r"\b(_\w+)\(", src):
        g = getattr(mod, nome, None)
        if callable(g) and (p := _papel(g, vistos)):
            papeis.append(p)
    return max(papeis, key=ORDEM.__getitem__) if papeis else None


def referencia_api() -> str:
    from config.api import api

    linhas = []
    for prefixo, router in api._routers:
        for caminho, visao in router.path_operations.items():
            for op in visao.operations:
                f = op.view_func
                cabeca = _fonte(f).split("def " + f.__name__)[0]
                acesso = "público" if "auth=None" in cabeca else (_papel(f) or "logado")
                doc = (inspect.getdoc(f) or "").split("\n")[0].replace("|", "/")
                rota = ("/api" + prefixo + caminho).replace("//", "/")
                app = f.__module__.split(".")[1]
                for metodo in op.methods:
                    linhas.append((app, rota, metodo, acesso, doc))
    out = [
        "# Referência da API\n\n",
        CABECALHO,
        "Autenticação global por sessão do Django (cookie) + CSRF em toda escrita. **Acesso** é o papel "
        "mínimo na loja da sessão (`atendente < gerente < dono`); `logado` = só exige login; `público` = "
        "sem login. Contrato completo (schemas): `/api/docs` e `/api/openapi.json`.\n\n",
        f"Total: {len(linhas)} operações.\n",
    ]
    app_atual = None
    for app, rota, metodo, acesso, doc in sorted(linhas):
        if app != app_atual:
            out.append(
                f"\n## `{app}`\n\n| Método | Rota | Acesso | O que faz |\n| --- | --- | --- | --- |\n"
            )
            app_atual = app
        out.append(f"| {metodo} | `{rota}` | {acesso} | {doc} |\n")
    return "".join(out)


def referencia_modelos() -> str:
    out = ["# Referência dos modelos\n\n", CABECALHO]
    rel_er = []
    blocos = []
    for app in apps.get_app_configs():
        if not app.name.startswith("apps."):
            continue
        modelos = list(app.get_models())
        if not modelos:
            continue
        blocos.append(f"\n## `{app.label}`\n")
        for m in modelos:
            doc = (m.__doc__ or "").strip().split("\n")[0]
            if doc.startswith(m.__name__ + "("):
                doc = ""
            blocos.append(f"\n### {m.__name__}\n\n{doc + chr(10) + chr(10) if doc else ''}")
            blocos.append("| Campo | Tipo | Observação |\n| --- | --- | --- |\n")
            for f in m._meta.get_fields():
                if not f.concrete or f.name == "id":
                    continue
                tipo = f.get_internal_type().replace("Field", "")
                obs = []
                if f.is_relation:
                    destino = f.related_model.__name__
                    obs.append(f"→ {destino}")
                    card = "||--o|" if f.one_to_one else "||--o{"
                    if destino != "Loja":  # todo modelo é da loja: no diagrama só polui
                        rel_er.append(f"    {destino} {card} {m.__name__} : {f.name}")
                if getattr(f, "null", False):
                    obs.append("opcional")
                if getattr(f, "choices", None):
                    obs.append("valores: " + ", ".join(str(c[0]) for c in f.choices))
                if f.help_text:
                    obs.append(str(f.help_text))
                blocos.append(f"| `{f.name}` | {tipo} | {'; '.join(obs)} |\n")
    out.append(
        "Todo modelo de domínio herda `ModeloDaLoja` (campo `loja` + `.da_loja()`): o isolamento por "
        "loja é por linha. Por isso a `Loja` fica fora do diagrama.\n\n"
    )
    out.append(
        "## Relações\n\n```mermaid\nerDiagram\n" + "\n".join(sorted(set(rel_er))) + "\n```\n"
    )
    out.extend(blocos)
    return "".join(out)


def referencia_operacao() -> str:
    out = [
        "# Referência de comandos e configurações\n\n",
        CABECALHO,
        "## Comandos (`manage.py`)\n\n",
    ]
    out.append("| Comando | App | O que faz |\n| --- | --- | --- |\n")
    for nome, app in sorted(get_commands().items()):
        if not app.startswith("apps."):
            continue
        ajuda = getattr(load_command_class(app, nome), "help", "")
        out.append(f"| `{nome}` | {app.split('.')[1]} | {ajuda} |\n")
    out.append(
        "\n## Configurações do produto (`config/settings/base.py`)\n\n"
        "Padrões definidos no código. Os valores de produção ficam no `.env` do servidor e **não** "
        "aparecem aqui.\n\n| Setting | Padrão no código | Nota |\n| --- | --- | --- |\n"
    )
    from config.settings.base import env

    esquema = getattr(env, "scheme", {})
    base = (Path(settings.BASE_DIR) / "config" / "settings" / "base.py").read_text(encoding="utf-8")
    for nome, resto in re.findall(r"^(MIDIA_[A-Z_]+) = (.+)$", base, flags=re.M):
        m = re.search(r"default=([^)]+)\)", resto)
        padrao = m.group(1) if m else resto.split("#")[0].strip()
        if "env(" in padrao and not m:
            # declaração em várias linhas: env(\n    "NOME", default="...")
            multi = re.search(rf'^{nome} = env\(\s*"{nome}",\s*default=([^\n]+?)\s*\)', base, re.M)
            if multi:
                padrao = multi.group(1)
            else:
                padrao = str(esquema[nome][1]) if nome in esquema else "(ver base.py)"
        nota = (resto.split("#", 1)[1].strip() if "#" in resto else "").replace("|", "/")
        if any(s in nome for s in ("KEY", "SEGREDO", "SECRET")):
            padrao = "vazio (definir só no .env)"
        out.append(f"| `{nome}` | `{padrao.strip()}` | {nota} |\n")
    return "".join(out)


class Command(BaseCommand):
    help = (
        "Gera docs/tecnico/referencia-*.md a partir do código (API, modelos, comandos, settings)."
    )

    def handle(self, *args, **opts):
        PASTA.mkdir(parents=True, exist_ok=True)
        for nome, texto in (
            ("referencia-api.md", referencia_api()),
            ("referencia-modelos.md", referencia_modelos()),
            ("referencia-operacao.md", referencia_operacao()),
        ):
            (PASTA / nome).write_text(texto, encoding="utf-8", newline="\n")
            self.stdout.write(f"[ok] docs/tecnico/{nome}")
