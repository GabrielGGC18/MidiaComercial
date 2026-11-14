"""Gera as falas da demonstração pública (voz sintética do Windows, pt-BR) + picos da onda.

Uso (Windows, com ffmpeg no PATH):  python scripts/gerar-audio-percurso.py
Saída: public/media/percurso/*.mp3 e src/features/apresentacao/audios.gerado.ts
A voz do funcionário é a mesma voz com tom mais grave (ffmpeg), para diferenciar os papéis.
Os textos precisam ser iguais aos de cenario-balcao.ts (a legenda usa exatamente o falado).
"""

import json
import os
import struct
import subprocess
import tempfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "public", "media", "percurso")
TS = os.path.join(RAIZ, "src", "features", "apresentacao", "audios.gerado.ts")
PS = r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe"
N_PICOS = 40

FALAS = [
    ("f-anota", "funcionario", "Anota: procuraram calça jeans azul, tamanho 42, e não tinha."),
    ("a-confere", "assistente", "Entendi. Calça jeans azul, 42, sem estoque. Confere?"),
    ("f-confirma", "funcionario", "Isso, pode registrar."),
    ("a-registrado", "assistente", "Registrado. Agora são 6 procuras desse item nesta semana."),
    ("a-saldo", "assistente", "O saldo informado está zerado. Vale conferir o estoque físico."),
    ("f-pergunta", "funcionario", "O que eu faço com isso?"),
    (
        "a-decide",
        "assistente",
        "Confira o estoque e consulte o fornecedor antes de comprar. Você decide se cria uma ação.",
    ),
]


def falar(texto: str, wav: str):
    t = texto.replace("'", "''")
    cmd = (
        "Add-Type -AssemblyName System.Speech;"
        "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;"
        "$s.SelectVoice('Microsoft Maria Desktop');$s.Rate=1;"
        f"$s.SetOutputToWaveFile('{wav}');$s.Speak('{t}');$s.Dispose()"
    )
    subprocess.run([PS, "-NoProfile", "-Command", cmd], check=True)


def picos(mp3: str) -> tuple[list[float], int]:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", mp3, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"],
        check=True,
        capture_output=True,
    ).stdout
    amostras = struct.unpack(f"<{len(raw) // 2}h", raw)
    dur_ms = round(len(amostras) / 8000 * 1000)
    passo = max(1, len(amostras) // N_PICOS)
    vals = [max(abs(a) for a in amostras[i : i + passo]) for i in range(0, passo * N_PICOS, passo)]
    topo = max(vals) or 1
    return [round(v / topo, 2) for v in vals], dur_ms


def main():
    os.makedirs(SAIDA, exist_ok=True)
    manifesto = {}
    with tempfile.TemporaryDirectory() as tmp:
        for id_, autor, texto in FALAS:
            wav = os.path.join(tmp, f"{id_}.wav")
            mp3 = os.path.join(SAIDA, f"{id_}.mp3")
            falar(texto, wav)
            filtro = (
                # apara silêncio só no começo e no fim (stop_periods cortaria pausas no meio da frase)
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
                + (
                    "asetrate=22050*0.84,aresample=22050,atempo=1.12,"
                    if autor == "funcionario"
                    else ""
                )
                + "loudnorm=I=-18:TP=-2"
            )
            subprocess.run(
                [
                    "ffmpeg",
                    "-v",
                    "error",
                    "-y",
                    "-i",
                    wav,
                    "-af",
                    filtro,
                    "-ac",
                    "1",
                    "-ar",
                    "22050",
                    "-b:a",
                    "48k",
                    mp3,
                ],
                check=True,
            )
            pk, dur = picos(mp3)
            manifesto[id_] = {
                "src": f"/media/percurso/{id_}.mp3",
                "duracaoMs": dur,
                "picos": pk,
                "texto": texto,
            }
            print(id_, dur, "ms")
    with open(TS, "w", encoding="utf-8", newline="\n") as f:
        f.write("// GERADO por scripts/gerar-audio-percurso.py. Não edite à mão.\n")
        f.write("// Voz sintética (Microsoft Maria, pt-BR) para a demonstração pública.\n\n")
        f.write(
            "export const AUDIOS = "
            + json.dumps(manifesto, ensure_ascii=False, indent=2)
            + " as const;\n"
        )


if __name__ == "__main__":
    main()
