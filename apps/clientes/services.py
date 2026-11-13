"""Base de clientes: planilha (CSV/XLSX) entra e sai, busca pelos campos preenchidos + histórico."""

from __future__ import annotations

import csv
import io
import re
import secrets
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.acoes.auditoria import registrar_evento
from apps.comercio.models import ItemPedido, Pedido
from apps.core.faixas import FaixaEtaria, normalizar_faixa

from .models import Cliente

MAX_LINHAS = 5000
DESCANSO_DIAS = 14  # entre contatos do agente


class PlanilhaErro(Exception):
    pass


# ── normalização ──────────────────────────────────────────────────────────────
def _chave(txt: str) -> str:
    t = unicodedata.normalize("NFKD", str(txt).strip().lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")


ALIASES = {
    "ref": {"cliente_ref", "ref", "codigo", "codigo_cliente", "id_cliente"},
    "nome": {"nome", "cliente", "nome_cliente"},
    "whatsapp": {"whatsapp", "telefone", "celular", "fone", "zap"},
    "faixa_etaria": {"faixa_etaria", "faixa", "idade", "faixa_de_idade"},
    "tamanhos": {"tamanhos", "tamanho", "numeracao"},
    "categorias": {"categorias", "categorias_interesse", "interesses", "interesse", "preferencias"},
    "consentimento": {
        "consentimento",
        "aceita_contato",
        "opt_in",
        "autoriza_contato",
        "autoriza_whatsapp",
    },
    "observacao": {"observacao", "obs", "observacoes"},
}
CAMPO_DE = {alias: campo for campo, nomes in ALIASES.items() for alias in nomes}
SIM = {"sim", "s", "true", "1", "x", "yes", "y", "autorizo", "ok"}


def normalizar_whatsapp(valor: str | None) -> str:
    """'(63) 99999-1234' → '5563999991234'. Vazio → ''. Inválido → ValueError."""
    d = re.sub(r"\D", "", str(valor or ""))
    if not d:
        return ""
    if d.startswith("55") and len(d) in (12, 13):
        return d
    if len(d) in (10, 11):
        return "55" + d
    raise ValueError("WhatsApp inválido: use DDD + número, ex.: (63) 99999-1234")


def _lista(valor) -> list[str]:
    if valor is None:
        return []
    partes = re.split(r"[,;/|]", str(valor))
    return list(dict.fromkeys(p.strip() for p in partes if p.strip()))


def novo_ref() -> str:
    return "C-" + secrets.token_hex(3)


# ── leitura da planilha ───────────────────────────────────────────────────────
def _ler_linhas(nome: str, conteudo: bytes) -> list[dict]:
    if conteudo[:2] == b"PK" or nome.lower().endswith(".xlsx"):
        from openpyxl import load_workbook

        try:
            wb = load_workbook(io.BytesIO(conteudo), read_only=True, data_only=True)
        except Exception as exc:  # noqa: BLE001
            raise PlanilhaErro("Não consegui abrir a planilha. Salve como .xlsx ou CSV.") from exc
        linhas = list(wb.active.iter_rows(values_only=True))
        if not linhas:
            raise PlanilhaErro("A planilha está vazia.")
        cab = [_chave(c or "") for c in linhas[0]]
        dados = [
            dict(zip(cab, ["" if v is None else v for v in ln], strict=False)) for ln in linhas[1:]
        ]
    else:
        try:
            texto = conteudo.decode("utf-8-sig")
        except UnicodeDecodeError:
            texto = conteudo.decode("latin-1")
        sep = (
            ";" if texto.split("\n", 1)[0].count(";") >= texto.split("\n", 1)[0].count(",") else ","
        )
        leitor = csv.DictReader(io.StringIO(texto), delimiter=sep)
        dados = [{_chave(k or ""): (v or "") for k, v in ln.items()} for ln in leitor]
    saida = []
    for d in dados:
        m = {CAMPO_DE[k]: v for k, v in d.items() if k in CAMPO_DE}
        if any(str(v).strip() for v in m.values()):
            saida.append(m)
    if not saida:
        raise PlanilhaErro(
            "Não encontrei colunas conhecidas. Use: cliente_ref, nome, whatsapp, faixa_etaria, "
            "tamanhos, categorias, consentimento."
        )
    if len(saida) > MAX_LINHAS:
        raise PlanilhaErro(f"Máximo de {MAX_LINHAS} linhas por planilha.")
    return saida


@dataclass
class ResultadoImportacao:
    criados: int = 0
    atualizados: int = 0
    rejeitados: list[dict] = field(default_factory=list)


@transaction.atomic
def importar_planilha(*, loja, usuario, nome_arquivo: str, conteudo: bytes) -> ResultadoImportacao:
    linhas = _ler_linhas(nome_arquivo, conteudo)
    r = ResultadoImportacao()
    agora = timezone.now()
    por_ref = {c.ref: c for c in Cliente.objects.da_loja(loja)}
    por_zap = {c.whatsapp: c for c in por_ref.values() if c.whatsapp}
    for n, d in enumerate(linhas, start=2):
        try:
            zap = normalizar_whatsapp(d.get("whatsapp"))
            faixa = normalizar_faixa(d.get("faixa_etaria")) or ""
        except ValueError as exc:
            r.rejeitados.append({"linha": n, "erro": str(exc)})
            continue
        ref = str(d.get("ref") or "").strip()[:64]
        cliente = por_ref.get(ref) if ref else por_zap.get(zap) if zap else None
        novo = cliente is None
        if novo:
            if not (d.get("nome") or zap or ref):
                r.rejeitados.append({"linha": n, "erro": "linha sem cliente_ref, nome ou WhatsApp"})
                continue
            cliente = Cliente(loja=loja, ref=ref or novo_ref(), origem=Cliente.Origem.PLANILHA)
        if d.get("nome"):
            cliente.nome = str(d["nome"]).strip()[:120]
        if zap:
            cliente.whatsapp = zap
        if faixa:
            cliente.faixa_etaria = faixa
        if d.get("tamanhos"):
            cliente.tamanhos = _lista(d["tamanhos"])
        if d.get("categorias"):
            cliente.categorias_interesse = _lista(d["categorias"])
        if d.get("observacao"):
            cliente.observacao = str(d["observacao"]).strip()[:300]
        if "consentimento" in d and str(d["consentimento"]).strip():
            ok = _chave(d["consentimento"]) in SIM
            if ok and not cliente.consentimento_contato:
                cliente.consentimento_em = agora
            cliente.consentimento_contato = ok
        cliente.save()
        por_ref[cliente.ref] = cliente
        if cliente.whatsapp:
            por_zap[cliente.whatsapp] = cliente
        if novo:
            r.criados += 1
        else:
            r.atualizados += 1
    registrar_evento(
        loja, usuario, "clientes_importados", f"planilha:{nome_arquivo[:60]}",
        criados=r.criados, atualizados=r.atualizados, rejeitados=len(r.rejeitados),
    )  # fmt: skip
    return r


# ── histórico de compras (liga pelo ref opaco) ───────────────────────────────
def historico(loja, refs: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = defaultdict(
        lambda: {
            "pedidos": 0,
            "ultima_compra": None,
            "gasto": Decimal("0"),
            "categorias": Counter(),
        }
    )
    if not refs:
        return {}
    itens = (
        ItemPedido.objects.da_loja(loja)
        .filter(pedido__cliente_ref__in=refs, pedido__status=Pedido.Status.CONCLUIDA)
        .select_related("pedido", "variante__produto")
    )
    vistos = set()
    for i in itens:
        h = out[i.pedido.cliente_ref]
        if i.pedido_id not in vistos:
            vistos.add(i.pedido_id)
            h["pedidos"] += 1
            if h["ultima_compra"] is None or i.pedido.data_hora > h["ultima_compra"]:
                h["ultima_compra"] = i.pedido.data_hora
        h["gasto"] += i.receita_item
        h["categorias"][i.variante.produto.categoria] += i.quantidade
    return dict(out)


def _saida(c: Cliente, h: dict | None) -> dict:
    h = h or {"pedidos": 0, "ultima_compra": None, "gasto": Decimal("0"), "categorias": Counter()}
    descanso = c.ultimo_contato_em and c.ultimo_contato_em > timezone.now() - timedelta(
        days=DESCANSO_DIAS
    )
    return {
        "id": c.id,
        "ref": c.ref,
        "nome": c.nome,
        "whatsapp": c.whatsapp,
        "faixa_etaria": c.faixa_etaria,
        "faixa_rotulo": FaixaEtaria(c.faixa_etaria).label if c.faixa_etaria else "",
        "tamanhos": c.tamanhos,
        "categorias_interesse": c.categorias_interesse,
        "observacao": c.observacao,
        "consentimento_contato": c.consentimento_contato,
        "consentimento_em": c.consentimento_em,
        "origem": c.origem,
        "ultimo_contato_em": c.ultimo_contato_em,
        "em_descanso": bool(descanso),
        "pedidos": h["pedidos"],
        "ultima_compra": h["ultima_compra"],
        "gasto": h["gasto"].quantize(Decimal("0.01")),
        "categorias_compradas": [k for k, _ in h["categorias"].most_common(4)],
    }


def _txt(s: str) -> str:
    return _chave(s).replace("_", " ")


def buscar(
    loja,
    *,
    q="",
    faixa="",
    categoria="",
    tamanho="",
    consentimento=None,
    sem_compra_dias=None,
    limite=200,
):
    clientes = list(Cliente.objects.da_loja(loja))
    hist = historico(loja, [c.ref for c in clientes])
    agora = timezone.now()
    termos = _txt(q).split()
    out = []
    for c in clientes:
        h = hist.get(c.ref)
        cats = {_txt(x) for x in c.categorias_interesse} | {
            _txt(x) for x in (h["categorias"] if h else [])
        }
        if termos:
            alvo = " ".join([_txt(c.nome), c.ref.lower(), c.whatsapp, c.observacao.lower(), *cats])
            if not all(t in alvo for t in termos):
                continue
        if faixa and c.faixa_etaria != faixa:
            continue
        if categoria and _txt(categoria) not in cats:
            continue
        if tamanho and tamanho.upper() not in {t.upper() for t in c.tamanhos}:
            continue
        if consentimento is not None and c.consentimento_contato != consentimento:
            continue
        if sem_compra_dias:
            ultima = h["ultima_compra"] if h else None
            if ultima and ultima > agora - timedelta(days=sem_compra_dias):
                continue
        out.append(_saida(c, h))
        if len(out) >= limite:
            break
    return out


def detalhe(loja, cliente: Cliente) -> dict:
    return _saida(cliente, historico(loja, [cliente.ref]).get(cliente.ref))


def revogar_consentimento(*, loja, usuario, cliente: Cliente) -> Cliente:
    cliente.consentimento_contato = False
    cliente.save(update_fields=["consentimento_contato", "atualizado_em"])
    registrar_evento(loja, usuario, "consentimento_revogado", f"cliente:{cliente.pk}")
    return cliente


COLUNAS_EXPORT = [
    "cliente_ref", "nome", "whatsapp", "faixa_etaria", "tamanhos", "categorias",
    "consentimento", "pedidos", "ultima_compra", "gasto", "categorias_compradas",
]  # fmt: skip


def exportar_csv(loja) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(COLUNAS_EXPORT)
    for c in buscar(loja, limite=MAX_LINHAS):
        ultima = c["ultima_compra"]
        w.writerow(
            [
                c["ref"], c["nome"], c["whatsapp"], c["faixa_rotulo"], ", ".join(c["tamanhos"]),
                ", ".join(c["categorias_interesse"]),
                "sim" if c["consentimento_contato"] else "não",
                c["pedidos"],
                timezone.localtime(ultima).strftime("%d/%m/%Y") if ultima else "",
                str(c["gasto"]).replace(".", ","), ", ".join(c["categorias_compradas"]),
            ]
        )  # fmt: skip
    return buf.getvalue()


MODELO_PLANILHA = (
    "cliente_ref;nome;whatsapp;faixa_etaria;tamanhos;categorias;consentimento\n"
    "C-001;João Exemplo;(63) 99999-0001;25-34;M, 40;Camisetas, Calças;sim\n"
    ";Pedro Exemplo;63988880002;45;G;Camisas;não\n"
)
