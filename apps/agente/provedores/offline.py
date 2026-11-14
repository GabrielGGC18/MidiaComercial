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


_DEZENAS = {"vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50, "sessenta": 60,
            "setenta": 70, "oitenta": 80, "noventa": 90}  # fmt: skip
_UNIDADES = {"um": 1, "dois": 2, "tres": 3, "quatro": 4, "cinco": 5, "seis": 6, "sete": 7,
             "oito": 8, "nove": 9}  # fmt: skip
_EXTENSO = re.compile(
    r"\b(" + "|".join(_DEZENAS) + r")(?:\s+e\s+(" + "|".join(_UNIDADES) + r"))?\b"
)


def numeros_por_extenso(t: str) -> str:
    """'jeans quarenta e dois' → 'jeans 42' (voz transcrita costuma vir por extenso).
    Devolve o texto em minúsculas e sem acento."""
    return _EXTENSO.sub(
        lambda m: str(_DEZENAS[m.group(1)] + _UNIDADES.get(m.group(2) or "", 0)), sem_acento(t)
    )


def _diminutivo(w: str) -> str:
    """'bermudinha' → 'bermuda', 'cintinho' → 'cinto'."""
    if len(w) > 6 and w.endswith(("inha", "inho")):
        return w[:-4] + w[-1]
    return w


# ── extratores ────────────────────────────────────────────────────────────────
def extrair_faixa(t: str) -> str | None:
    n = sem_acento(t)
    m = re.search(r"(\d{1,2})\s*anos", n) or re.search(r"\bu(?:ns|ma)\s+(\d{2})\b", n)
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
    n = re.sub(r"\bu(?:ns|ma)\s+\d{2}\b", " ", n)  # "uns 30": idade aproximada
    achados = []
    for m in re.finditer(r"\b(?:tamanho|tam|numero|numeracao)\s+([a-z0-9]{1,3})\b", n):
        achados.append(m.group(1).upper())
    for w in palavras(n):
        if w in TAMANHOS_LETRA or w in numericos or (w.isdigit() and 33 <= int(w) <= 48):
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
    if re.search(
        r"\b(caros?|preco|valor|barato|salgad[oa]s?)\b"
        r"|\b(achou|estava|tava|esta|ta|muito|meio|bem)\s+(\w+\s+){0,3}?car[ao]s?\b"
        r"|\bcar[ao]s?\s+demais\b",
        n,
    ):  # "o cara de uns 30" não é preço
        return "preco", False
    if re.search(r"\b(prazo|demora|entrega|encomenda)\b", n):
        return "prazo", False
    if re.search(
        r"(nao tinha|sem|faltou|nao achou)\s+(o |a )?(tamanho|numero|numeracao|cor)|\bso tinha\b", n
    ):
        return "variacao_ausente", False
    if re.search(
        r"(nao tinha|tinha nao|nao tem|sem estoque|acabou|esgotad|faltou|nao encontr|nao achou"
        r"|em falta|zerou|zerad)",
        n,
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
        r"(encalhad|parad[oa]s?|em baixa|nao (esta|ta) vendendo|vender mais|buscar clientes|quem (pode )?comprar|oferecer|prospect|desova|desencalh|girar (o )?estoque|queimar (o )?estoque)",
        n,
    ):
        return "prospeccao"
    if re.search(
        r"(cadastr|cliente nov|novo cliente|anot\w* (o |a )?cliente|salv\w* (o |a )?cliente|\[telefone_)",
        n,
    ):
        return "cliente"
    if re.search(
        r"(procur|queria|pediu|nao tinha|tinha nao|faltou|nao encontr|sem estoque|acabou|esgot|zerou"
        r"|em falta|caro|cara demais|salgad)",
        n,
    ):
        return "demanda"
    if re.search(
        r"(faixa|idade|publico|quem compra|horario|periodo|melhor dia|que horas|quando vend"
        r"|vendem? mais|vendemos mais|dia da semana)",
        n,
    ):
        return "publico"
    if re.search(r"(vend(emos|eu|i|as)|faturamento|faturei|receita|ticket)", n):
        return "vendas"  # não há ferramenta de vendas: o agente aponta a tela certa
    return "desconhecida"  # nada de procura no texto: planejar decide se dá para registrar


def achar_produto(loja, t: str, extras: set[str]):
    """Procura o produto por janelas de palavras, da maior para a menor. Antes só cortava do
    fim, e "adolescente procurou bermuda" não achava a bermuda (palavra extra no começo)."""
    ws = [
        _diminutivo(w)
        for w in palavras(t)
        if w not in STOP and w not in extras and not w.startswith("[") and not w.isdigit()
        and len(w) > 2
    ]  # fmt: skip
    for tam in range(min(4, len(ws)), 0, -1):
        for i in range(len(ws) - tam + 1):
            janela = ws[i : i + tam]
            r = buscar_catalogo(loja, " ".join(janela), limite=3)
            if r:
                return r[0], janela
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
    if tipo == "vendas":
        return []
    if tipo != "cliente":
        texto = numeros_por_extenso(texto)  # nome de cliente precisa da maiúscula original

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
    if tipo == "desconhecida" and produto is None and not (tamanhos or cor):
        # "bom dia", "obrigado", "me ajuda": não vira registro de procura de "bom dia"
        return []
    if produto and cor and produto["cores"] and cor not in produto["cores"] and motivo == "outro":
        motivo, motivo_incerto = "variacao_ausente", False  # pediu uma cor que não existe
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
    modelo = ""

    def __init__(self):
        from . import Uso

        self.uso = Uso()

    def executar(self, ctx, texto: str, chamar, historico: list | None = None) -> str:
        # sem memória: cada frase é lida sozinha (o histórico é ganho do LLM)
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
    return " ".join(partes) or AJUDA


AJUDA = (
    "Não entendi. Eu registro o que o cliente procurou e não levou "
    "(“cliente procurou calça jeans 42 e não tinha”), digo quem compra e quando "
    "(“que horas vende mais?”) e acho clientes para produto parado (“quero vender a camisa parada”). "
    "Vendas e receita ficam em Oportunidades e Meu público."
)
