// Cliente da API: sessão Django + CSRF, mesma origem (FRONTEND.md §8.2)

export interface ErroApiCorpo {
  detail: string;
  codigo?: "sem_loja" | "proibido" | "nao_encontrado" | "nao_autenticado" | "validacao" | string;
  erros?: { campo: string | null; mensagem: string }[];
}

export class ApiError extends Error {
  status: number;
  corpo: ErroApiCorpo;
  constructor(status: number, corpo: ErroApiCorpo) {
    super(corpo.detail);
    this.status = status;
    this.corpo = corpo;
  }
}

function getCookie(nome: string) {
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(nome + "="))
    ?.split("=")[1];
}

export async function garantirCsrf() {
  if (!getCookie("csrftoken")) await fetch("/api/csrf", { credentials: "include" });
}

export async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const metodo = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD"].includes(metodo)) {
    await garantirCsrf();
    headers.set("X-CSRFToken", getCookie("csrftoken") ?? "");
  }
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, { detail: "Sem conexão com o servidor. Verifique a internet e tente de novo." });
  }
  if (res.status === 204) return undefined as T;
  const tipo = res.headers.get("content-type") ?? "";
  const corpo = tipo.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    // 5xx (servidor fora, proxy, timeout) ou resposta sem JSON: o visitante nunca vê o texto técnico
    if (res.status >= 500 || !corpo?.detail) throw new ApiError(res.status, erroAmigavel(res.status, corpo?.codigo));
    throw new ApiError(res.status, corpo);
  }
  return corpo as T;
}

function erroAmigavel(status: number, codigo?: string): ErroApiCorpo {
  if (status === 503 || status === 502 || codigo === "indisponivel")
    return { detail: "O sistema está em manutenção. Tente de novo em alguns minutos.", codigo: "indisponivel" };
  if (status === 504) return { detail: "O servidor demorou para responder. Tente de novo.", codigo: "tempo_esgotado" };
  if (status === 413) return { detail: "Arquivo grande demais. Envie um arquivo de até 20 MB.", codigo: "grande_demais" };
  if (status === 429) return { detail: "Muitas tentativas. Espere um minuto e tente de novo.", codigo: "limite" };
  if (status >= 500) return { detail: "Algo deu errado no servidor. Tente de novo em instantes.", codigo: "erro_servidor" };
  return { detail: `Não foi possível concluir (erro ${status}). Tente de novo.` };
}

export const json = (dados: unknown) => JSON.stringify(dados);

export function mensagemErro(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.corpo.erros?.length) return e.corpo.erros.map((x) => x.mensagem).join(" · ");
    return e.corpo.detail;
  }
  return "Algo deu errado. Tente de novo.";
}
