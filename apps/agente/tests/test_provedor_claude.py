"""Provedor Claude com cliente falso: valida o laço de tool use, a validação de argumentos,
o fallback sem propostas órfãs, a memória curta e a privacidade. Nenhuma chamada de rede."""

import json
from types import SimpleNamespace as NS

import anthropic
import pytest
from django.test import Client

from apps.agente.ferramentas import REGISTRO, ArgumentoInvalido, validar_args
from apps.agente.models import ChamadaFerramenta, PropostaAgente, SessaoAgente
from apps.core.demo import criar_demo
from conftest import api_login


@pytest.fixture
def demo(db, settings):
    criar_demo(log=lambda *_: None)
    settings.MIDIA_IA_HABILITADA = True
    settings.MIDIA_IA_PROVEDOR = "claude"
    settings.MIDIA_IA_API_KEY = "teste"
    settings.MIDIA_IA_MODELO = "claude-haiku-4-5"


def _c(u):
    c = Client(enforce_csrf_checks=True)
    api_login(c, u, "demo1234")
    return c


def _msg(c, texto, **extra):
    return c.post(
        "/api/agente/mensagens", {"texto": texto, **extra}, content_type="application/json"
    )


def _uso():
    return NS(input_tokens=100, output_tokens=20, cache_read_input_tokens=50)


def _tool(nome, args, i=1):
    return NS(
        stop_reason="tool_use",
        content=[NS(type="tool_use", name=nome, input=args, id=f"t{i}")],
        usage=_uso(),
    )


def _fim(texto):
    return NS(stop_reason="end_turn", content=[NS(type="text", text=texto)], usage=_uso())


def _ultimo_resultado(kw):
    return kw["messages"][-1]["content"][0]


class Falso:
    """Roteiro: lista de respostas ou funções(kwargs) → resposta. Guarda cada chamada."""

    def __init__(self, roteiro):
        self.roteiro, self.chamadas = list(roteiro), []
        self.messages = self

    def create(self, **kw):
        self.chamadas.append(json.loads(json.dumps(kw, default=lambda o: vars(o))))
        passo = self.roteiro.pop(0)
        if isinstance(passo, Exception):
            raise passo
        return passo(kw) if callable(passo) else passo


@pytest.fixture
def roteiro(monkeypatch):
    def montar(*passos):
        falso = Falso(passos)
        monkeypatch.setattr(anthropic, "Anthropic", lambda **_: falso)
        return falso

    return montar


def test_tool_use_completo_com_contexto_cache_e_tokens(demo, roteiro):
    def demanda(kw):
        produtos = json.loads(_ultimo_resultado(kw)["content"])["produtos"]
        args = {"produto_id": produtos[0]["id"], "tamanho": "42", "cor": "Azul",
                "motivo": "indisponivel", "faixa_etaria": "35_44"}  # fmt: skip
        return _tool("propor_demanda", args, 2)

    falso = roteiro(_tool("buscar_variante", {"texto": "calça jeans"}), demanda, _fim("Preparei."))
    r = _msg(_c("ana"), "cliente procurou calça jeans 42 azul, uns 40 anos, não tinha").json()
    assert r["provedor"] == "claude" and r["resposta"] == "Preparei."
    p = r["propostas"][0]
    assert p["dados"]["tamanho"] == "42" and p["campos_incertos"] == []
    primeira = falso.chamadas[0]
    assert primeira["model"] == "claude-haiku-4-5"
    assert primeira["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert "Calças" in primeira["system"][1]["text"]  # vocabulário da loja
    assert {t["name"] for t in primeira["tools"]} == {"buscar_variante", "propor_demanda"}
    s = SessaoAgente.objects.get(pk=r["sessao_id"])
    assert (s.tokens_entrada, s.tokens_saida, s.passos) == (450, 60, 2)
    assert s.modelo == "claude-haiku-4-5" and s.fallback == ""
    assert ChamadaFerramenta.objects.filter(sessao=s).count() == 2


def test_argumento_invalido_volta_ao_modelo_que_corrige(demo, roteiro):
    falso = roteiro(
        _tool("propor_demanda", {"motivo": "sumiu", "produto_texto": "bota"}),
        _tool(
            "propor_demanda",
            {
                "motivo": "indisponivel",
                "produto_texto": "bota",
                "inventado": 1,
                "campos_incertos": ["produto"],
            },
            2,
        ),  # fmt: skip
        _fim("Ok."),
    )
    r = _msg(_c("ana"), "procurou bota e não tinha").json()
    erro = falso.chamadas[1]["messages"][-1]["content"][0]
    assert erro["is_error"] is True and "Use: indisponivel" in erro["content"]
    assert len(r["propostas"]) == 1 and r["propostas"][0]["dados"]["motivo"] == "indisponivel"


def test_falha_no_meio_cai_no_offline_sem_proposta_orfa(demo, roteiro):
    roteiro(
        _tool("propor_demanda", {"motivo": "preco", "produto_texto": "lixo do llm"}),
        anthropic.APIConnectionError(request=NS(method="POST", url="x")),
    )
    antes = PropostaAgente.objects.count()
    r = _msg(_c("ana"), "cliente procurou calça jeans 42 e não tinha").json()
    assert r["provedor"] == "offline"
    assert PropostaAgente.objects.count() == antes + 1  # só a do offline
    assert not PropostaAgente.objects.filter(dados__produto_texto="lixo do llm").exists()
    s = SessaoAgente.objects.get(pk=r["sessao_id"])
    assert "APIConnectionError" in s.fallback and s.tokens_entrada == 150


def test_memoria_curta_e_sessao_alheia(demo, roteiro):
    falso = roteiro(_fim("Anotado."), _fim("Corrigido."))
    c = _c("gerente.centro")
    r1 = _msg(c, "quem compra mais à noite?").json()
    _msg(c, "e de manhã?", sessao_id=r1["sessao_id"])
    hist = falso.chamadas[1]["messages"]
    assert [m["role"] for m in hist] == ["user", "assistant", "user"]
    assert hist[0]["content"] == "quem compra mais à noite?" and hist[1]["content"] == "Anotado."
    s = SessaoAgente.objects.get(pk=r1["sessao_id"])
    assert s.turnos == 2 and len(s.historico) == 4
    # outra pessoa (ou outra loja) não continua a conversa
    assert _msg(_c("dono.centro"), "oi", sessao_id=s.id).status_code == 404
    assert _msg(_c("gerente.norte"), "oi", sessao_id=s.id).status_code == 404


def test_dado_pessoal_nao_chega_ao_llm(demo, roteiro):
    falso = roteiro(_fim("Ok."), _fim("Ok."))
    c = _c("gerente.centro")
    r = _msg(c, "procurou camisa, deixou o zap (63) 98877-1122").json()
    enviado = json.dumps(falso.chamadas[0], ensure_ascii=False)
    assert "98877" not in enviado and "[TELEFONE_1]" in enviado
    # cadastro fica local e não entra na memória que o LLM lê na próxima fala
    _msg(c, "cadastrar cliente Pedro Alves autoriza mensagem", sessao_id=r["sessao_id"])
    _msg(c, "e agora?", sessao_id=r["sessao_id"])
    enviado = json.dumps(falso.chamadas[1], ensure_ascii=False)
    assert "Pedro" not in enviado and "tratado localmente" in enviado


def test_validar_args_unitario():
    f = REGISTRO["propor_demanda"]
    assert validar_args(f, {"motivo": "preco", "xyz": 1}) == {"motivo": "preco"}
    with pytest.raises(ArgumentoInvalido, match="faltou motivo"):
        validar_args(f, {"tamanho": "M"})
    with pytest.raises(ArgumentoInvalido, match="produto_id deveria ser"):
        validar_args(f, {"motivo": "preco", "produto_id": "12"})
    with pytest.raises(ArgumentoInvalido, match="deveria ser"):
        validar_args(f, {"motivo": "preco", "produto_id": True})  # bool não é integer


def test_uso_do_agente_so_para_gestao(demo, roteiro):
    roteiro(_fim("Ok."))
    _msg(_c("gerente.centro"), "quem compra mais?")
    u = _c("gerente.centro").get("/api/agente/uso").json()
    assert u["sessoes"] == 1 and u["com_llm"] == 1 and u["modelo"] == "claude-haiku-4-5"
    assert u["tokens_entrada"] == 150
    assert _c("ana").get("/api/agente/uso").status_code == 403
