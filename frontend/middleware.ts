/**
 * Vercel Routing Middleware: encaminha /api, /admin e /static para a API Django na VPS.
 *
 * O endereço da API NÃO fica no repositório (que é público): vem da variável de ambiente
 * API_ORIGEM, configurada no painel da Vercel (Settings → Environment Variables), ex.:
 *   API_ORIGEM = https://<dominio-da-api>
 *
 * Para o navegador tudo continua na mesma origem (o domínio do front): cookie de sessão
 * e CSRF funcionam sem CORS. Só roda na Vercel; em dev, o proxy do vite.config.ts faz isso.
 *
 * NUNCA coloque segredo aqui nem em variável VITE_*: o front é público. A chave da IA
 * (MIDIA_IA_API_KEY) fica só no .env do backend, na VPS.
 *
 * IP real do visitante para o rate limit: a Vercel informa o IP em `x-real-ip` (ela
 * sobrescreve o valor do cliente). Repassamos em `x-midia-cliente-ip` junto com
 * `x-midia-proxy` = API_SEGREDO (variável da Vercel, igual a MIDIA_PROXY_SEGREDO no .env
 * da VPS). Sem o segredo certo, o backend ignora o IP repassado (apps/core/limites.py).
 * Este código roda no servidor da Vercel: o segredo não vai para o navegador.
 */
import { rewrite } from "@vercel/functions/middleware";

export const config = { matcher: ["/api/:path*", "/admin/:path*", "/static/:path*"] };

const INDISPONIVEL = JSON.stringify({
  detail: "O sistema está em manutenção. Tente de novo em alguns minutos.",
  codigo: "indisponivel",
});

function indisponivel(motivo: string): Response {
  // o motivo técnico vai só para o log da Vercel (Functions → Logs), nunca para o visitante
  console.error(`[midiacomercial] proxy da API indisponível: ${motivo}`);
  return new Response(INDISPONIVEL, {
    status: 503,
    headers: { "content-type": "application/json; charset=utf-8", "retry-after": "60", "cache-control": "no-store" },
  });
}

/**
 * Aceita o valor como costuma ser colado no painel: com aspas, espaços, quebra de linha,
 * "API_ORIGEM=" na frente, sem "https://", com barra ou caminho no fim. Fica só a origem.
 */
export function normalizarOrigem(bruto: string | undefined): URL | null {
  let v = (bruto ?? "").trim().replace(/^API_ORIGEM\s*=\s*/i, "").trim().replace(/^["'`]+|["'`]+$/g, "").trim();
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) v = `https://${v.replace(/^\/+/, "")}`;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) return null;
    return new URL(u.origin);
  } catch {
    return null;
  }
}

/** Mesmo cuidado do API_ORIGEM: tira espaços, quebra de linha, aspas e "API_SEGREDO=" colados. */
export function limparSegredo(bruto: string | undefined): string {
  return (bruto ?? "")
    .trim()
    .replace(/^API_SEGREDO\s*=\s*/i, "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

/** API_ORIGEM apontando para o próprio front (ou outro deploy da Vercel) não é a API: o
 * proxy cairia num 404 da Vercel sem explicação. */
export function apontaParaVercel(base: URL, requisicao: URL): boolean {
  return base.host === requisicao.host || base.hostname.endsWith(".vercel.app");
}

export default function middleware(request: Request): Response {
  const base = normalizarOrigem(process.env.API_ORIGEM);
  if (!base) {
    return indisponivel(process.env.API_ORIGEM ? "API_ORIGEM em formato inválido (use https://dominio-da-api)" : "API_ORIGEM não definida");
  }
  const url = new URL(request.url);
  if (apontaParaVercel(base, url)) {
    return indisponivel(`API_ORIGEM aponta para a Vercel (${base.host}), não para a API na VPS`);
  }
  const destino = new URL(url.pathname + url.search, base);
  try {
    const cabecalhos = new Headers(request.headers);
    // o cliente não escolhe estes valores: sempre sobrescritos (ou removidos) aqui
    cabecalhos.delete("x-midia-proxy");
    cabecalhos.delete("x-midia-cliente-ip");
    cabecalhos.delete("x-midia-via");
    const segredo = limparSegredo(process.env.API_SEGREDO);
    const ip = (request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
    // só caracteres válidos em cabeçalho HTTP (ASCII visível)
    const segredoOk = /^[!-~]{16,}$/.test(segredo);
    const ipOk = /^[0-9a-fA-F.:]{3,45}$/.test(ip);
    if (segredoOk && ipOk) {
      cabecalhos.set("x-midia-proxy", segredo);
      cabecalhos.set("x-midia-cliente-ip", ip);
    }
    // diagnóstico para a API (nunca contém o segredo): o middleware rodou? o segredo está configurado?
    const estado = !process.env.API_SEGREDO ? "ausente" : segredoOk ? "ok" : "formato";
    cabecalhos.set("x-midia-via", `mw; segredo=${estado}; ip=${ipOk ? "ok" : "ausente"}`);
    return rewrite(destino, { request: { headers: cabecalhos } });
  } catch (e) {
    console.error("[midiacomercial] falha ao montar cabeçalhos do proxy; seguindo sem eles", e);
    // nunca derruba o site: sem o segredo o rate limit ainda funciona (por IP da conexão)
    return rewrite(destino);
  }
}
