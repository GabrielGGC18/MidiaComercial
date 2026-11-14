// CSV para abrir direto no Excel em português: ponto e vírgula, aspas quando precisa e BOM (acentos).
export type LinhaCsv = readonly (string | number | null | undefined)[];

function celula(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  // fórmula digitada em campo de texto não pode virar fórmula na planilha
  const seguro = /^[=+\-@]/.test(s) && typeof v !== "number" ? `'${s}` : s;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

export function montarCsv(linhas: readonly LinhaCsv[]) {
  return linhas.map((l) => l.map(celula).join(";")).join("\r\n");
}

export function baixarCsv(nome: string, linhas: readonly LinhaCsv[]) {
  const url = URL.createObjectURL(new Blob(["﻿" + montarCsv(linhas)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
