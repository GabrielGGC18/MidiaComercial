"""Provedor offline: intérprete determinístico em português. Padrão; funciona sem internet.

Entende frases do balcão (texto ou voz transcrita), cadastro de cliente, prospecção e
perguntas sobre o público. Marca como "incerto" tudo que não conseguiu ler com segurança.
"""

from __future__ import annotations

import re
import unicodedata

from apps.comercio.models import Produto, Variante
from apps.core.faixas import faixa_da_idade
from apps.publico.services import buscar_catalogo

TAMANHOS_LETRA = {"pp", "p", "m", "g", "gg", "xg", "xgg", "u"}
CORES = {
    "azul", "preta", "preto", "branca", "branco", "verde", "vermelha", "vermelho", "cinza",
    "bege", "marrom", "amarela", "amarelo", "rosa", "roxa", "roxo", "laranja", "vinho",
}  # fmt: skip
STOP = {
    "cliente", "procurou", "procurando", "procura", "queria", "quer", "pediu", "nao", "tinha", "tem",
    "uma", "um", "uns", "umas", "de", "da", "do", "no", "na", "e", "o", "a", "os", "as", "com",
    "sem", "estoque", "tamanho", "numero", "cor", "anos", "ano", "mais", "ou", "menos", "por",
    "faltou", "acabou", "encontrou", "achou", "senhor", "senhora", "jovem", "rapaz", "moca",
    "idade", "aproximadamente", "cerca", "tipo", "aquela", "aquele", "para", "pra", "ele", "ela",
    "caro", "preco", "prazo", "demora", "entrega", "esgotado", "esgotada",
}  # fmt: skip


def sem_acento(t: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", t.lower()) if not unicodedata.combining(c)
    )


def palavras(t: str) -> list[str]:
    return re.findall(r"\[[a-z]+_\d+\]|[a-z0-9]+", sem_acento(t))


# ── extratores ────────────────────────────────────────────────────────────────
def extrair_faixa(t: str) -> str | None:
    n = sem_acento(t)
    m = re.search(r"(\d{1,2})\s*anos", n)
    if m:
        return faixa_da_idade(int(m.group(1)))
    if "meia idade" in n:
        return "45_59"
    if re.search(r"\b(idos[oa]|aposentad[oa]|senhor(a)?|vov[oó])\b", n):
        return "60_mais"
    if re.search(r"\b(adolescente|menin[oa]|crianca)\b", n):
        return "ate_17"
    if re.search(r"\b(jovem|garot[oa]|rapaz|moca|universitari[oa])\b", n):
        return "18_24"
    return None


def extrair_tamanhos(t: str, numericos: set[str]) -> list[str]:
    n = sem_acento(t)
    n = re.sub(r"\d{1,2}\s*anos", " ", n)  # idade não é tamanho
    achados = []
    for m in re.finditer(r"\b(?:tamanho|tam|numero|numeracao)\s+([a-z0-9]{1,3})\b", n):
        achados.append(m.group(1).upper())
    for w in palavras(n):
        if w in TAMANHOS_LETRA or w in numericos:
            achados.append(w.upper())
    return list(dict.fromkeys(achados))


def extrair_cor(t: str, cores_catalogo: set[str]) -> str | None:
    ws = set(palavras(t))
    for c in sorted(cores_catalogo, key=len, reverse=True):
        if sem_acento(c) in ws:
            return c
    for w in ws:
        if w in CORES:
            return w.capitalize()
    return None


def extrair_motivo(t: str) -> tuple[str, bool]:
    n = sem_acento(t)
    if re.search(r"\b(caro|preco|valor|barato)\b", n):
        return "preco", False
    if re.search(r"\b(prazo|demora|entrega|encomenda)\b", n):
        return "prazo", False
    if re.search(r"(nao tinha|sem|faltou|nao achou)\s+(o |a )?(tamanho|numero|numeracao|cor)", n):
        return "variacao_ausente", False
    if re.search(
        r"(nao tinha|sem estoque|acabou|esgotad|faltou|nao encontr|nao achou|em falta)", n
    ):
        return "indisponivel", False
    return "outro", True


def extrair_consentimento(t: str) -> bool | None:
    n = sem_acento(t)
    if re.search(r"nao (quer|autoriz|aceit|deixa|pode)", n):
        return False
    if re.search(r"(autoriz|aceit|pode mandar|quer receber|topou|deixou mandar|pode chamar)", n):
        return True
    return None


def extrair_nome(t: str) -> str | None:
    m = re.search(
        r"(?:cliente|chamad[oa]|chama|nome (?:é|e)|se chama)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)?)",
        t,
    )
    return m.group(1) if m else None


# ── intenção ──────────────────────────────────────────────────────────────────
def intencao(t: str) -> str:
    n = sem_acento(t)
    if re.search(
        r"(encalhad|parad[oa]s?|em baixa|nao (esta|ta) vendendo|vender mais|buscar clientes|quem (pode )?comprar|oferecer|prospect)",
        n,
    ):
        return "prospeccao"
    if re.search(
        r"(cadastr|cliente nov|novo cliente|anot\w* (o |a )?cliente|salv\w* (o |a )?cliente|\[telefone_)",
        n,
    ):
        return "cliente"
    if re.search(r"(procur|queria|pediu|nao tinha|faltou|nao encontr|sem estoque|acabou|esgot)", n):
        return "demanda"
    if re.search(
        r"(faixa|idade|publico|quem compra|horario|periodo|melhor dia|que horas|quando vend)", n
    ):
        return "publico"
    return "demanda"


def achar_produto(loja, t: str, extras: set[str]):
    ws = [
        w
        for w in palavras(t)
        if w not in STOP and w not in extras and not w.startswith("[") and not w.isdigit()
    ]
    while ws:
        r = buscar_catalogo(loja, " ".join(ws), limite=3)
        if r:
            return r[0], ws
        ws = ws[:-1]
    return None, []


def planejar(ctx, texto: str) -> list[tuple[str, dict]]:
    """Traduz a frase em chamadas de ferramenta (mesmo contrato do provedor Claude)."""
    tipo = intencao(texto)
    if tipo == "prospeccao":
        termos = [
            w
            for w in palavras(texto)
            if len(w) > 3
            and w not in STOP
            and w
            not in {
                "quero",
                "vender",
                "parada",
                "parado",
                "paradas",
                "parados",
                "encalhado",
                "encalhada",
                "baixa",
                "buscar",
                "clientes",
                "oferecer",
                "produto",
                "produtos",
                "loja",
                "mais",
            }
        ]
        return [("prospectar_produtos_em_baixa", {"termo": " ".join(termos) or None})]
    if tipo == "publico":
        return [("resumo_publico", {"dias": 30})]

    cores_cat = set(
        Variante.objects.da_loja(ctx.loja).exclude(cor="").values_list("cor", flat=True)
    )
    numericos = {
        t.lower()
        for t in Variante.objects.da_loja(ctx.loja).values_list("tamanho", flat=True)
        if t.isdigit()
    }
    tamanhos = extrair_tamanhos(texto, numericos)
    cor = extrair_cor(texto, cores_cat)
    faixa = extrair_faixa(texto)
    extras = {sem_acento(c) for c in cores_cat} | CORES | {t.lower() for t in tamanhos}

    if tipo == "cliente":
        zap = next((w.upper() for w in palavras(texto) if w.startswith("[telefone_")), None)
        cats = sorted(
            {
                c
                for c in Produto.objects.da_loja(ctx.loja).values_list("categoria", flat=True)
                if sem_acento(c).rstrip("s") in sem_acento(texto)
            }
        )
        return [
            (
                "propor_cliente",
                {
                    "nome": extrair_nome(texto),
                    "whatsapp": zap,
                    "faixa_etaria": faixa,
                    "tamanhos": tamanhos,
                    "categorias_interesse": cats,
                    "consentimento_contato": extrair_consentimento(texto),
                },
            )
        ]

    motivo, motivo_incerto = extrair_motivo(texto)
    produto, _ = achar_produto(ctx.loja, texto, extras)
    incertos = ["motivo"] if motivo_incerto else []
    tamanho = tamanhos[0] if tamanhos else None
    if produto is None:
        incertos.append("produto")
        resto = [
            w for w in palavras(texto) if w not in STOP and w not in extras and not w.isdigit()
        ]
        texto_livre = " ".join(resto[:4]) or None
        return [("propor_demanda", {"produto_texto": texto_livre, "tamanho": tamanho, "cor": cor,
                                    "motivo": motivo, "faixa_etaria": faixa, "campos_incertos": incertos})]  # fmt: skip
    if produto["tamanhos"] and not tamanho:
        incertos.append("tamanho")
    if tamanho and produto["tamanhos"] and tamanho not in produto["tamanhos"]:
        incertos.append("tamanho")
    if produto["cores"] and len(produto["cores"]) > 1 and not cor:
        incertos.append("cor")
    if not cor and len(produto["cores"]) == 1:
        cor = produto["cores"][0]
    return [
        (
            "propor_demanda",
            {
                "produto_id": produto["id"],
                "tamanho": tamanho,
                "cor": cor,
                "motivo": motivo,
                "faixa_etaria": faixa,
                "campos_incertos": incertos,
            },
        )
    ]


class ProvedorOffline:
    nome = "offline"

    def executar(self, ctx, texto: str, chamar) -> str:
        resultados = [(nome, chamar(nome, args)) for nome, args in planejar(ctx, texto)]
        return resposta_padrao(resultados)


def resposta_padrao(resultados) -> str:
    partes = []
    for nome, r in resultados:
        if nome == "propor_demanda":
            inc = r.get("campos_incertos") or []
            partes.append(
                f"Preparei o registro: {r['resumo']}."
                + (f" Confira: {', '.join(inc)}." if inc else "")
            )
        elif nome == "propor_cliente":
            inc = r.get("campos_incertos") or []
            partes.append(
                "Preparei o cadastro do cliente." + (f" Confira: {', '.join(inc)}." if inc else "")
            )
        elif nome == "prospectar_produtos_em_baixa":
            cs = r["campanhas"]
            if not cs:
                partes.append(
                    "Não encontrei produto em baixa com clientes consentidos para oferecer agora."
                )
            else:
                lista = "; ".join(f"{c['titulo']} ({c['contatos']} clientes)" for c in cs)
                partes.append(
                    f"Encontrei {len(cs)} oportunidade(s) de contato: {lista}. Revise e aprove cada mensagem."
                )
        elif nome == "resumo_publico":
            cats = ", ".join(f"{c}: {p}" for c, p in r["por_categoria"][:3])
            fx = r["faixa_que_mais_compra"]
            partes.append(
                f"Período mais forte: {r['periodo_mais_forte']}. Por nicho: {cats}. "
                f"Fase do mês com mais receita: dias {r['fase_do_mes_mais_forte']}. "
                + (
                    f"Faixa que mais compra: {fx} (cobertura {r['cobertura_faixa_pct']:.0f}%). "
                    if fx
                    else "Sem faixa etária suficiente ainda. "
                )
                + r["limitacao"]
            )
    return " ".join(partes) or "Não entendi. Tente: “cliente procurou calça jeans 42 e não tinha”."
