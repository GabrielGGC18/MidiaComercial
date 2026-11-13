"""Importação de CSV: prévia → confirmação em transação → reconciliação (§3.2, P0-2).

- A loja vem da sessão, nunca do arquivo.
- Reimportar o mesmo arquivo não duplica (hash + chaves únicas de pedido/item).
- Não guarda o CSV bruto: só hash, totais, erros por linha e as linhas válidas até confirmar.
"""

from __future__ import annotations

import csv
import hashlib
import io
from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from pydantic import ValidationError

from apps.acoes.auditoria import registrar_evento
from apps.comercio.models import ItemPedido, Pedido, Produto, Variante
from apps.estoque.models import SnapshotEstoque

from .models import LinhaRejeitada, LoteImportacao
from .schemas import (
    COLUNAS_ESTOQUE,
    COLUNAS_OBRIGATORIAS,
    SEPARADOR,
    LinhaEstoqueCSV,
    LinhaVendaCSV,
)

SISTEMA_ORIGEM = "csv"
MAX_REJEITADAS_GRAVADAS = 500


class ImportacaoErro(Exception):
    """Erro de arquivo inteiro (não de linha): mensagem pronta para o lojista."""


# ── mensagens em português de loja (FRONTEND.md §4.6) ─────────────────────────
def _mensagem(err: dict) -> str:
    tipo, ctx = err.get("type", ""), err.get("ctx") or {}
    mapa = {
        "missing": "está vazio",
        "string_too_short": "está vazio",
        "string_too_long": "é longo demais",
        "int_parsing": "precisa ser um número inteiro",
        "int_from_float": "precisa ser um número inteiro",
        "decimal_parsing": "precisa ser um valor (ex.: 119,80)",
        "decimal_max_places": "use no máximo 2 casas decimais",
        "decimal_max_digits": "valor grande demais",
        "datetime_parsing": "data/hora inválida (use 2026-11-01T10:30:00-03:00)",
        "datetime_from_date_parsing": "data/hora inválida (use 2026-11-01T10:30:00-03:00)",
        "literal_error": "deve ser 'concluida' ou 'cancelada'",
    }
    if tipo == "greater_than":
        return f"precisa ser maior que {ctx.get('gt')}"
    if tipo == "greater_than_equal":
        return "não pode ser negativo"
    if tipo == "value_error":
        return str(err.get("msg", "")).removeprefix("Value error, ")
    return mapa.get(tipo, err.get("msg", "valor inválido"))


def _erros_pydantic(exc: ValidationError) -> list[dict]:
    return [
        {"campo": str(e["loc"][0]) if e.get("loc") else None, "mensagem": _mensagem(e)}
        for e in exc.errors()
    ]


def _ler_csv(conteudo: bytes, obrigatorias: tuple[str, ...]) -> list[dict]:
    try:
        texto = conteudo.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ImportacaoErro(
            "O arquivo não está em UTF-8. Salve como 'CSV UTF-8' e envie de novo."
        ) from exc
    leitor = csv.DictReader(io.StringIO(texto), delimiter=SEPARADOR)
    colunas = [c.strip() for c in (leitor.fieldnames or [])]
    if len(colunas) <= 1:
        raise ImportacaoErro("Não encontramos colunas. O separador deve ser ponto e vírgula (;).")
    faltando = [c for c in obrigatorias if c not in colunas]
    if faltando:
        raise ImportacaoErro("Faltam colunas obrigatórias: " + ", ".join(faltando) + ".")
    linhas = []
    for bruta in leitor:
        linha = {(k or "").strip(): (v or "") for k, v in bruta.items()}
        if any(str(v).strip() for v in linha.values()):
            linhas.append(linha)
    if not linhas:
        raise ImportacaoErro("O arquivo não tem nenhuma linha de dados.")
    return linhas


@dataclass
class ResultadoValidacao:
    pendentes: list[dict]
    rejeitadas: list[tuple[int, list[dict]]]
    duplicadas: int
    total: Decimal


def _validar_vendas(loja, linhas: list[dict]) -> ResultadoValidacao:
    pendentes, rejeitadas, vistos = [], [], set()
    duplicadas, total = 0, Decimal("0")

    validas: list[tuple[int, LinhaVendaCSV]] = []
    for idx, linha in enumerate(linhas, start=2):  # linha 1 = cabeçalho
        try:
            validas.append((idx, LinhaVendaCSV(**linha)))
        except ValidationError as exc:
            rejeitadas.append((idx, _erros_pydantic(exc)))

    ids = {v.pedido_id for _, v in validas}
    existentes = set(
        ItemPedido.objects.da_loja(loja)
        .filter(pedido__sistema_origem=SISTEMA_ORIGEM, pedido__pedido_id_origem__in=ids)
        .values_list("pedido__pedido_id_origem", "item_id")
    )
    for _idx, v in validas:
        chave = (v.pedido_id, v.item_id)
        if chave in vistos or chave in existentes:
            duplicadas += 1
            continue
        vistos.add(chave)
        if v.status == "concluida":
            total += v.receita_item
        pendentes.append(v.model_dump(mode="json"))
    return ResultadoValidacao(pendentes, rejeitadas, duplicadas, total)


def _validar_estoque(loja, linhas: list[dict]) -> ResultadoValidacao:
    pendentes, rejeitadas, vistos = [], [], set()
    duplicadas = 0
    skus = set(Variante.objects.da_loja(loja).values_list("sku", flat=True))
    for idx, linha in enumerate(linhas, start=2):
        try:
            v = LinhaEstoqueCSV(**linha)
        except ValidationError as exc:
            rejeitadas.append((idx, _erros_pydantic(exc)))
            continue
        if v.sku not in skus:
            rejeitadas.append(
                (idx, [{"campo": "sku", "mensagem": f"SKU {v.sku} não existe no catálogo"}])
            )
            continue
        chave = (v.sku, v.capturado_em)
        if chave in vistos:
            duplicadas += 1
            continue
        vistos.add(chave)
        pendentes.append(v.model_dump(mode="json"))
    return ResultadoValidacao(pendentes, rejeitadas, duplicadas, Decimal("0"))


def gerar_previa(
    *, loja, usuario, nome_arquivo: str, conteudo: bytes, tipo: str, total_origem: Decimal | None
) -> LoteImportacao:
    arquivo_hash = hashlib.sha256(conteudo).hexdigest()
    anterior = (
        LoteImportacao.objects.da_loja(loja).filter(tipo=tipo, arquivo_hash=arquivo_hash).first()
    )
    if anterior and anterior.status == LoteImportacao.Status.CONFIRMADO:
        quando = timezone.localtime(anterior.confirmado_em).strftime("%d/%m às %H:%M")
        raise ImportacaoErro(
            f"Este arquivo já foi importado em {quando} (lote #{anterior.pk}). Nada foi duplicado."
        )
    if anterior:
        anterior.delete()  # prévia/cancelado antigo do mesmo arquivo: refaz

    obrigatorias = COLUNAS_OBRIGATORIAS if tipo == "vendas" else COLUNAS_ESTOQUE
    linhas = _ler_csv(conteudo, obrigatorias)
    validar = _validar_vendas if tipo == "vendas" else _validar_estoque
    r = validar(loja, linhas)

    with transaction.atomic():
        lote = LoteImportacao.objects.create(
            loja=loja,
            tipo=tipo,
            arquivo_hash=arquivo_hash,
            nome_arquivo=nome_arquivo[:200],
            criado_por=usuario,
            linhas_ok=len(r.pendentes),
            linhas_rejeitadas=len(r.rejeitadas),
            linhas_duplicadas=r.duplicadas,
            total_importado=r.total,
            total_origem_informado=total_origem,
            linhas_pendentes=r.pendentes,
        )
        LinhaRejeitada.objects.bulk_create(
            [
                LinhaRejeitada(lote=lote, numero_linha=n, erros=e)
                for n, e in r.rejeitadas[:MAX_REJEITADAS_GRAVADAS]
            ]
        )
    return lote


def _variante_para(loja, sku: str, categoria: str, nome: str | None, cache: dict) -> Variante:
    if sku in cache:
        return cache[sku]
    variante = Variante.objects.da_loja(loja).filter(sku=sku).first()
    if variante is None:
        produto, _ = Produto.objects.get_or_create(
            loja=loja, referencia=sku, defaults={"nome": nome or sku, "categoria": categoria}
        )
        variante = Variante.objects.create(loja=loja, produto=produto, sku=sku)
    cache[sku] = variante
    return variante


@transaction.atomic
def confirmar(*, loja, usuario, lote_id: int) -> LoteImportacao:
    lote = LoteImportacao.objects.da_loja(loja).select_for_update().get(pk=lote_id)
    if lote.status != LoteImportacao.Status.PREVIA:
        raise ImportacaoErro("Este lote já foi confirmado ou cancelado.")

    if lote.tipo == LoteImportacao.Tipo.VENDAS:
        cache, pedidos, extras_dup, refs_novos = {}, {}, 0, set()
        for d in lote.linhas_pendentes:
            variante = _variante_para(loja, d["sku"], d["categoria"], d.get("variante"), cache)
            pedido = pedidos.get(d["pedido_id"])
            if pedido is None:
                pedido, novo = Pedido.objects.get_or_create(
                    loja=loja,
                    sistema_origem=SISTEMA_ORIGEM,
                    pedido_id_origem=d["pedido_id"],
                    defaults={
                        "data_hora": d["data_hora"],
                        "status": d["status"],
                        "cliente_ref": d.get("cliente_ref"),
                        "canal": d.get("canal") or "",
                        "faixa_etaria": d.get("faixa_etaria") or "",
                        "lote": lote,
                    },
                )
                pedidos[d["pedido_id"]] = pedido
                if novo and pedido.cliente_ref and pedido.status == "concluida":
                    refs_novos.add(pedido.cliente_ref)
            _, criado = ItemPedido.objects.get_or_create(
                pedido=pedido,
                item_id=d["item_id"],
                defaults={
                    "loja": loja,
                    "variante": variante,
                    "quantidade": d["quantidade"],
                    "receita_item": Decimal(d["receita_item"]),
                    "custo_total_item": (
                        Decimal(d["custo_total_item"]) if d.get("custo_total_item") else None
                    ),
                },
            )
            if not criado:
                extras_dup += 1
        lote.linhas_ok -= extras_dup
        lote.linhas_duplicadas += extras_dup
    else:
        variantes = {v.sku: v for v in Variante.objects.da_loja(loja)}
        SnapshotEstoque.objects.bulk_create(
            [
                SnapshotEstoque(
                    loja=loja,
                    variante=variantes[d["sku"]],
                    saldo=d["saldo"],
                    capturado_em=d["capturado_em"],
                    lote=lote,
                )
                for d in lote.linhas_pendentes
                if d["sku"] in variantes
            ]
        )

    lote.status = LoteImportacao.Status.CONFIRMADO
    lote.confirmado_em = timezone.now()
    lote.linhas_pendentes = []
    lote.save()
    from apps.notificacoes.eventos import IMPORTACAO_DIVERGENTE, publicar

    rec = reconciliacao(lote)
    if rec and rec["nivel"] == "alto":
        publicar(
            IMPORTACAO_DIVERGENTE, loja, chave=f"lote:{lote.pk}", lote=lote.pk,
            percentual=str(rec["percentual"]).replace(".", ","),
            importado=rec["importado"], origem=rec["origem"],
        )  # fmt: skip
    if lote.tipo == LoteImportacao.Tipo.VENDAS:
        from apps.agente.prospeccao import verificar_conversoes

        verificar_conversoes(loja, refs_novos)
    registrar_evento(
        loja, usuario, "importacao_confirmada", f"lote:{lote.pk}",
        tipo=lote.tipo, linhas=lote.linhas_ok, total=str(lote.total_importado),
    )  # fmt: skip
    return lote


def cancelar(*, loja, usuario, lote_id: int) -> LoteImportacao:
    lote = LoteImportacao.objects.da_loja(loja).get(pk=lote_id)
    if lote.status != LoteImportacao.Status.PREVIA:
        raise ImportacaoErro("Só dá para cancelar uma prévia.")
    lote.status = LoteImportacao.Status.CANCELADO
    lote.linhas_pendentes = []
    lote.save(update_fields=["status", "linhas_pendentes"])
    return lote


def reconciliacao(lote: LoteImportacao) -> dict | None:
    if lote.total_origem_informado is None or lote.tipo != LoteImportacao.Tipo.VENDAS:
        return None
    origem, importado = lote.total_origem_informado, lote.total_importado
    diferenca = origem - importado
    pct = (abs(diferenca) / origem * 100) if origem else Decimal("0")
    nivel = "ok" if pct <= Decimal("0.5") else ("atencao" if pct <= Decimal("2") else "alto")
    return {
        "origem": origem,
        "importado": importado,
        "diferenca": diferenca,
        "percentual": pct.quantize(Decimal("0.01")),
        "nivel": nivel,
    }


# ── modelos de CSV para download ──────────────────────────────────────────────
MODELO_VENDAS = (
    "pedido_id;item_id;data_hora;sku;categoria;quantidade;receita_item;status;"
    "cliente_ref;custo_total_item;canal;variante\n"
    "V001;1;2026-11-01T10:30:00-03:00;CAM-AZ-M;Camisetas;2;119,80;concluida;C-8f3a;;loja;"
    "Camiseta básica Azul M\n"
    "V001;2;2026-11-01T10:30:00-03:00;CIN-MA-U;Cintos;1;89,90;concluida;C-8f3a;;loja;"
    "Cinto couro Marrom\n"
    "V002;1;2026-11-01T15:12:00-03:00;CJE-AZ-42;Calças;1;179,90;cancelada;;;loja;Calça jeans 42\n"
)
MODELO_ESTOQUE = (
    "sku;saldo;capturado_em\n"
    "CAM-AZ-M;0;2026-11-12T18:00:00-03:00\n"
    "CIN-MA-U;14;2026-11-12T18:00:00-03:00\n"
)
