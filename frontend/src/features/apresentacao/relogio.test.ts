// Regressão: áudio de um trecho que termina antes do relógio não pode recomeçar do zero
// (play() numa mídia encerrada volta ao início e prendia o percurso num laço).
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEGMENTOS, TOTAL_MS } from "./cenario-balcao";
import { useRelogio } from "./useRelogio";

class AudioFalso {
  src = "";
  paused = true;
  ended = false;
  private t = 0;
  private desde = 0;
  get currentTime() {
    return this.paused ? this.t : this.t + (Date.now() - this.desde) / 1000;
  }
  set currentTime(v: number) {
    this.t = v;
    this.desde = Date.now();
    this.ended = false;
  }
  play() {
    if (this.ended) this.t = 0; // comportamento do navegador: mídia encerrada recomeça do início
    this.ended = false;
    this.paused = false;
    this.desde = Date.now();
    return Promise.resolve();
  }
  pause() {
    this.t = this.currentTime;
    this.paused = true;
  }
  /** termina o arquivo atual como o navegador faz */
  terminar() {
    this.t = this.currentTime;
    this.ended = true;
    this.paused = true;
  }
}

describe("relógio do percurso", () => {
  let audio: AudioFalso;
  beforeEach(() => {
    vi.useFakeTimers();
    audio = new AudioFalso();
    vi.stubGlobal("Audio", function AudioTeste() {
      return audio;
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("não volta no tempo quando o áudio do trecho termina antes do relógio", () => {
    const { result } = renderHook(() => useRelogio());
    act(() => result.current.setGuiado(true));
    act(() => result.current.tocar(true));

    // primeiro trecho: o áudio termina 200 ms antes do tempo declarado
    const seg = SEGMENTOS[0]!;
    act(() => vi.advanceTimersByTime(seg.audioMs - 200));
    const antes = result.current.pos;
    audio.terminar();
    act(() => vi.advanceTimersByTime(400));
    expect(result.current.pos).toBeGreaterThanOrEqual(antes);

    // segue até o fim sem laço
    act(() => vi.advanceTimersByTime(TOTAL_MS + 5000));
    expect(result.current.status).toBe("fim");
  });
});
