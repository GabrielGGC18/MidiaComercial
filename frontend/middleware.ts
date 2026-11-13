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
  return rewrite(new URL(url.pathname + url.search, origem));
}
