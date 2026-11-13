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

export default function middleware(request: Request): Response {
  const origem = process.env.API_ORIGEM;
  if (!origem) {
    return new Response(
      JSON.stringify({ detail: "API não configurada (defina API_ORIGEM na Vercel)." }),
      { status: 503, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
  const url = new URL(request.url);
  const cabecalhos = new Headers(request.headers);
  // o cliente não escolhe estes valores: sempre sobrescritos (ou removidos) aqui
  cabecalhos.delete("x-midia-proxy");
  cabecalhos.delete("x-midia-cliente-ip");
  const segredo = process.env.API_SEGREDO;
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (segredo && ip) {
    cabecalhos.set("x-midia-proxy", segredo);
    cabecalhos.set("x-midia-cliente-ip", ip);
  }
  return rewrite(new URL(url.pathname + url.search, origem), { request: { headers: cabecalhos } });
}
