"""Orquestrador: loja da sessão, ferramentas por papel, validação, mascaramento, auditoria,
memória curta e fallback offline.

É o "grafo" do agente, escrito à mão: entrada → (provedor escolhe ferramentas → valida →
executa → audita)* → resposta. As pausas para a pessoa confirmar não são estado em memória:
são PropostaAgente pendentes no banco, que sobrevivem a reinício e a troca de aparelho.
"""

from __future__ import annotations

import logging
import time

from django.conf import settings
from django.utils import timezone

from .ferramentas import Contexto, obter, validar_args
from .models import ChamadaFerramenta, PropostaAgente, SessaoAgente
from .privacidade import mascarar, restaurar
from .provedores.offline import ProvedorOffline, intencao

log = logging.getLogger(__name__)

# frase de cadastro traz nome de pessoa, que não dá para mascarar com segurança:
# ela nunca vai para o LLM e também não entra na memória que o LLM lê depois
_CADASTRO_LOCAL = "[cadastro de cliente tratado localmente]"


# nome técnico da ferramenta → o que a pessoa lê na conversa
ROTULO_PASSO = {
    "buscar_variante": "Buscou no catálogo",
    "propor_demanda": "Preparou registro de procura",
    "propor_cliente": "Preparou cadastro de cliente",
    "buscar_clientes": "Buscou clientes",
    "prospectar_produtos_em_baixa": "Procurou produtos parados",
    "resumo_publico": "Leu o resumo do público",
}


def janela_llm(historico: list[dict]) -> list[dict]:
    """Últimas MIDIA_AGENTE_HISTORICO falas, só com role e content (a API da Anthropic
    rejeita chave extra). Número par: a janela sempre começa numa fala do usuário."""
    n = settings.MIDIA_AGENTE_HISTORICO
    n -= n % 2
    if not n:
        return []
    return [
        {"role": m["role"], "content": m["content"]}
        for m in historico[-n:]
        if isinstance(m.get("content"), str)
    ]


class SessaoInvalida(Exception):
    pass


def _hermes():
    from .provedores.hermes import ProvedorHermes  # sem SDK: só o socket da ponte

    return ProvedorHermes()


def _claude():
    from .provedores.claude import ProvedorClaude  # importa o SDK só se for usar

    return ProvedorClaude()


# MIDIA_IA_PROVEDOR → fábrica. Provedor novo = uma classe em provedores/ + uma linha aqui.
FABRICAS = {"hermes": _hermes, "claude": _claude}


def escolher_provedor():
    """Provedor configurado; qualquer problema para montá-lo cai no offline (nunca trava)."""
    nome = settings.MIDIA_IA_PROVEDOR
    if not settings.MIDIA_IA_HABILITADA or nome == "offline":
        return ProvedorOffline()
    fabrica = FABRICAS.get(nome)
    if fabrica is None:
        log.warning("MIDIA_IA_PROVEDOR=%r desconhecido; usando offline.", nome)
        return ProvedorOffline()
    try:
        return fabrica()
    except Exception as exc:  # noqa: BLE001
        log.warning("Provedor %s indisponível (%s); usando offline.", nome, exc)
        return ProvedorOffline()


def _sessao(loja, usuario, sessao_id: int | None) -> SessaoAgente:
    if sessao_id is None:
        return SessaoAgente.objects.create(loja=loja, usuario=usuario)
    s = SessaoAgente.objects.da_loja(loja).filter(pk=sessao_id, usuario=usuario).first()
    if s is None:  # outra loja ou outra pessoa: não existe para quem pediu
        raise SessaoInvalida("Conversa não encontrada.")
    return s


def processar(
    *, loja, usuario, papel: str, texto: str, canal: str = "texto", sessao_id: int | None = None
) -> dict:
    t0 = time.monotonic()
    texto = (texto or "").strip()[:500]
    local = intencao(texto) == "cliente"
    provedor = ProvedorOffline() if local else escolher_provedor()
    sessao = _sessao(loja, usuario, sessao_id)
    ctx = Contexto(loja=loja, usuario=usuario, papel=papel, sessao=sessao)
    mascarado, mapa = mascarar(texto)
    passos = {"n": 0}
    passos_nomes: list[str] = []

    def chamar(nome: str, args: dict):
        passos["n"] += 1
        if passos["n"] > settings.MIDIA_AGENTE_MAX_PASSOS:
            raise RuntimeError("Limite de passos do agente atingido.")
        f = obter(nome, papel)  # bloqueia ferramenta acima do papel
        passos_nomes.append(nome)
        t1 = time.monotonic()
        ok, resumo = True, ""
        try:
            limpos = validar_args(f, args)  # erro aqui volta ao LLM para ele corrigir
            saida = f.funcao(ctx, **restaurar(limpos, mapa))
            resumo = str(saida)[:300]
            return saida
        except Exception as exc:
            ok, resumo = False, str(exc)[:300]
            raise
        finally:
            ChamadaFerramenta.objects.create(
                loja=loja, sessao=sessao, usuario=usuario, ferramenta=nome,
                entrada=args,  # mascarada
                saida_resumo=mascarar(resumo)[0], ok=ok,
                duracao_ms=int((time.monotonic() - t1) * 1000),
            )  # fmt: skip

    fallback = ""
    try:
        resposta = provedor.executar(ctx, mascarado, chamar, janela_llm(sessao.historico))
    except Exception as exc:  # noqa: BLE001
        if provedor.nome == "offline":
            raise
        log.warning("Falha no provedor %s (%s); refazendo offline.", provedor.nome, exc)
        fallback = f"{type(exc).__name__}: {exc}"[:200]
        # o que o LLM deixou pela metade some: a pessoa só vê a versão offline, inteira
        ids = [p.id for p in ctx.propostas]
        PropostaAgente.objects.filter(id__in=ids, status=PropostaAgente.Status.PENDENTE).delete()
        ctx.propostas.clear()
        passos["n"] = 0
        passos_nomes.clear()
        uso_llm = provedor.uso
        provedor = ProvedorOffline()
        provedor.uso = uso_llm  # tokens gastos antes da falha contam
        resposta = provedor.executar(ctx, mascarado, chamar, [])

    fala = _CADASTRO_LOCAL if local else mascarado
    agora = timezone.now().isoformat()
    historico = [
        *sessao.historico,
        {"role": "user", "content": fala, "em": agora},
        {
            "role": "assistant",
            "content": resposta or "-",
            "em": agora,
            "propostas": [p.id for p in ctx.propostas],
            "passos": passos_nomes,
        },
    ]
    # guardamos a conversa inteira para a tela (mascarada); ao LLM vai só a janela curta
    g = settings.MIDIA_AGENTE_HISTORICO_GUARDADO
    sessao.historico = historico[-(g - g % 2) :]  # sempre começa no usuário
    sessao.provedor = provedor.nome
    sessao.modelo = getattr(provedor, "modelo", "") or sessao.modelo
    sessao.canal = canal
    sessao.turnos += 1
    sessao.passos += passos["n"]
    sessao.tokens_entrada += provedor.uso.tokens_entrada
    sessao.tokens_saida += provedor.uso.tokens_saida
    sessao.duracao_ms += int((time.monotonic() - t0) * 1000)
    sessao.fallback = fallback
    sessao.save()
    return {
        "sessao_id": sessao.id,
        "provedor": sessao.provedor,
        "resposta": restaurar(resposta, mapa),
        "propostas": list(ctx.propostas),
        "passos": [ROTULO_PASSO.get(n, n) for n in passos_nomes],
    }
