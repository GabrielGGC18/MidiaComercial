"""Provedor Hermes (GPT via OAuth do Hermes Agent na VPS).

Liga com MIDIA_IA_HABILITADA=True e MIDIA_IA_PROVEDOR=hermes. NÃO há chave aqui: as
credenciais OAuth ficam no perfil `midiacomercial` do Hermes, dentro do container dele.

Caminho (mesmo desenho do Mídia 63, ADR 0016/0017 de lá):
    container web ──socket unix──► ponte (systemd no host, usuário sem shell)
                                     └─ sudo wrapper fixo ─► docker exec hermes -p midiacomercial -z

O Hermes em modo `-z` devolve só texto, sem tool use nativo. Então o protocolo é JSON:
o modelo responde {"chamadas": [...], "resposta": "..."}; nós validamos e executamos
cada chamada com o mesmo `chamar()` do orquestrador (papel, loja, auditoria), e
devolvemos o resultado na rodada seguinte. Cada rodada custa ~10 s, por isso o modelo
pode pedir várias ferramentas de uma vez e responder junto quando der.

Recebe só texto mascarado (o orquestrador mascara antes) e saída de ferramenta passada
por `ocultar`. Qualquer falha → o orquestrador refaz no offline.
"""

from __future__ import annotations

import http.client
import json
import socket

from django.conf import settings

from ..ferramentas import ArgumentoInvalido, FerramentaNegada, disponiveis
from ..privacidade import ocultar
from . import Uso
from .prompts import SISTEMA, contexto_da_loja

PROTOCOLO = """Formato da sua resposta: SOMENTE um objeto JSON, sem texto fora dele, sem markdown.
{"chamadas": [{"ferramenta": "<nome>", "argumentos": {...}}], "resposta": "<texto ou null>"}

- Para usar ferramentas, liste-as em "chamadas" (pode mais de uma). Use só nomes e
  argumentos do catálogo abaixo, respeitando o schema.
- Os resultados voltam na próxima mensagem, em RESULTADOS.
- Mande "resposta" junto com "chamadas" SÓ quando a resposta não depender do resultado
  delas. Caso contrário, deixe "resposta": null e responda depois de ver os resultados.
- Para encerrar sem ferramentas: {"chamadas": [], "resposta": "..."}."""


class _UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, caminho: str, timeout: float):
        super().__init__("ponte", timeout=timeout)
        self.caminho = caminho

    def connect(self):
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(self.timeout)
        s.connect(self.caminho)
        self.sock = s


def _perguntar_ponte(prompt: str) -> str:
    conn = _UnixHTTPConnection(settings.MIDIA_HERMES_SOCKET, settings.MIDIA_HERMES_TIMEOUT)
    try:
        corpo = json.dumps({"prompt": prompt}, ensure_ascii=False).encode()
        conn.request("POST", "/chat", body=corpo, headers={"Content-Type": "application/json"})
        r = conn.getresponse()
        dados = json.loads(r.read() or b"{}")
    finally:
        conn.close()
    if r.status != 200:
        raise RuntimeError(f"Ponte do Hermes respondeu {r.status}: {dados.get('erro', '')[:120]}")
    return str(dados.get("texto", ""))


def _extrair_json(texto: str) -> dict:
    ini, fim = texto.find("{"), texto.rfind("}")
    if ini < 0 or fim <= ini:
        raise RuntimeError("O modelo não devolveu JSON.")
    obj = json.loads(texto[ini : fim + 1])
    if not isinstance(obj, dict):
        raise RuntimeError("JSON do modelo não é um objeto.")
    return obj


class ProvedorHermes:
    nome = "hermes"

    def __init__(self, perguntar=None):
        self.modelo = "hermes:midiacomercial"
        self.uso = Uso()  # o Hermes não informa tokens no modo -z
        self._perguntar = perguntar or _perguntar_ponte  # injetável nos testes

    def _prompt(self, ctx, texto: str, historico: list, rodadas: list[str]) -> str:
        catalogo = [
            {"nome": f.nome, "descricao": f.descricao, "parametros": f.parametros}
            for f in disponiveis(ctx.papel)
        ]
        conversa = "\n".join(
            f"{'Pessoa' if m.get('role') == 'user' else 'Agente'}: {m.get('content')}"
            for m in historico
            if isinstance(m.get("content"), str)
        )
        partes = [
            SISTEMA,
            PROTOCOLO,
            contexto_da_loja(ctx),
            "CATÁLOGO DE FERRAMENTAS:\n" + json.dumps(catalogo, ensure_ascii=False),
        ]
        if conversa:
            partes.append("CONVERSA ANTERIOR:\n" + conversa)
        partes.append("PEDIDO ATUAL: " + texto)
        partes.extend(rodadas)
        return "\n\n".join(partes)

    def executar(self, ctx, texto: str, chamar, historico: list | None = None) -> str:
        rodadas: list[str] = []
        for _ in range(settings.MIDIA_HERMES_MAX_RODADAS):
            obj = _extrair_json(self._perguntar(self._prompt(ctx, texto, historico or [], rodadas)))
            chamadas = obj.get("chamadas") or []
            resposta = (obj.get("resposta") or "").strip()
            if not isinstance(chamadas, list):
                raise RuntimeError("'chamadas' precisa ser uma lista.")

            resultados = []
            for c in chamadas[: settings.MIDIA_AGENTE_MAX_PASSOS]:
                nome = str((c or {}).get("ferramenta", ""))
                args = (c or {}).get("argumentos") or {}
                try:
                    saida = chamar(nome, dict(args))
                    item = {"ferramenta": nome, "ok": True, "saida": saida}
                except (ArgumentoInvalido, FerramentaNegada) as exc:
                    item = {"ferramenta": nome, "ok": False, "erro": str(exc)}  # o modelo corrige
                resultados.append(item)

            if resposta:
                return resposta
            if not chamadas:
                raise RuntimeError("Resposta vazia do modelo.")
            conteudo = ocultar(json.dumps(resultados, default=str, ensure_ascii=False))[:6000]
            rodadas.append(
                f"SUA RODADA: {json.dumps(obj, ensure_ascii=False)[:2000]}\nRESULTADOS: {conteudo}"
            )
        return "Preparei o que consegui; revise as propostas abaixo."
