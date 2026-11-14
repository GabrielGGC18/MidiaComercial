# 4. Frontend

React 19 + TypeScript + Vite 8 + Tailwind 4. TanStack Query (dados do servidor), React Router 7, React Hook
Form + Zod (formulários), Recharts (gráficos), Radix Dialog, Sonner (toasts), Motion e GSAP (animações da
página pública).

## 4.1 Rotas

`src/app/router.tsx`. As telas internas são `lazy`: o bundle inicial não carrega o app inteiro.

| Rota | Tela | Guarda |
| --- | --- | --- |
| `/` | Página inicial pública (o que é, como funciona, demonstração) | pública |
| `/login` | Formulário e botões "Entrar na demo" | pública |
| `/apresentar` | Modo apresentação (pitch) | pública |
| `/lojas` | Escolha de loja | `RequireLogin` |
| `/balcao` | Registro de procura (toques ou voz), em `BalcaoShell` | `RequireLoja papel="atendente"` |
| `/oportunidades` · `/importar` · `/publico` · `/demanda` · `/acoes` · `/acoes/:id` · `/clientes` · `/agente` | App de gestão, em `AppShell` | `RequireLoja papel="gerente"` |

A rota inicial depois do login vem de `lib/permissions.rotaInicial`: gerente e dono vão para
`/oportunidades`, atendente para `/balcao`. As guardas só ajudam a navegação: quem garante o acesso é a API.

## 4.2 Sessão e cliente da API

- `src/api/client.ts`: `api<T>(url, init)` usa `fetch` com `credentials: "include"`. Em toda escrita, garante o
  cookie `csrftoken` e manda `X-CSRFToken`.
- Erros viram `ApiError(status, corpo)`. Resposta 5xx, timeout ou página de erro do proxy vira mensagem
  amigável ("O sistema está em manutenção…"); o 4xx mantém a mensagem da API. `mensagemErro(e)` dá o texto
  para a tela.
- `src/api/sessao.tsx`: `AuthProvider` com `useQuery(["me"])`, `entrar`, `sair` e `trocarLoja`. Ao trocar de
  usuário ou de loja, remove o cache de dados (nunca mistura lojas), sem desligar a consulta de sessão.
- `useChaveLoja(...partes)` põe a loja na `queryKey`: dados de lojas diferentes nunca se confundem no cache.
- `src/app/providers.tsx`: `QueryClient` com `staleTime` de 30 s, sem retry em 4xx e com tratamento global
  (401 ou `sem_loja` → revalida a sessão).

## 4.3 Proxy na Vercel

`frontend/middleware.ts` (Routing Middleware) encaminha `/api`, `/admin` e `/static` para `API_ORIGEM`.
Para o navegador, tudo fica na mesma origem: cookie e CSRF funcionam sem CORS. O middleware:

- normaliza o `API_ORIGEM` colado no painel (aspas, espaços, falta de `https://`, barra no fim);
- recusa um `API_ORIGEM` que aponte para a própria Vercel;
- remove `x-midia-*` vindos do cliente e repassa o IP real com o segredo `API_SEGREDO`;
- se algo estiver errado, responde "em manutenção" e manda o motivo técnico só para o log da Vercel.

`vercel.json` faz o fallback da SPA (exceto `api`, `admin`, `static` e arquivos públicos) e define o cache dos
assets. Em dev, o proxy do `vite.config.ts` cumpre o mesmo papel.

## 4.4 Pastas

| Pasta | Conteúdo |
| --- | --- |
| `features/<tela>/` | Página, diálogos e testes de cada tela (oportunidades, demanda, importação, público, ações, clientes, agente, notificações, auth, home, apresentação, pitch) |
| `components/ui/` | Base: botão, card, dialog, input, badge, skeleton |
| `components/midia/` | Componentes do produto: cartão de oportunidade, sinais e selos, KPIs, agente, demanda, importação, gráficos, institucional |
| `components/efeitos/` | Animações inspiradas no React Bits (Aurora sem WebGL, CardSwap, Marquee, CountUp…), respeitando `prefers-reduced-motion` |
| `lib/` | `format.ts` (moeda, %, datas, período), `permissions.ts`, `termos.ts` (nome técnico → palavra de loja), `utils.ts` |
| `styles/tokens.css` | Tokens do design system Mídia UI (cores, tipografia, sinais) |

## 4.5 Padrões

- **Dados do servidor só pelo TanStack Query**, nunca copiados para estado local. Mutação → `invalidateQueries`
  nas chaves afetadas (a confirmação de proposta devolve `atualizar` com a lista).
- **Linguagem de loja:** rótulo técnico passa por `lib/termos.ts` ("Lacuna de mix" → "Falta no estoque").
- **Campos novos opcionais nos tipos** (`api/types.ts`): cartões de análises antigas não têm `resumo` e
  `numeros`, e a tela continua legível.
- **Formulário:** Zod + React Hook Form, com a mensagem de erro em português no campo.
- **Acessibilidade:** alvos de 44 px no celular, `aria-label` nos botões de ícone, foco devolvido ao fechar um
  diálogo, movimento reduzido.

## 4.6 Testes

Vitest + Testing Library (`npm test`). Cobrem cliente da API e middleware (normalização e proteções),
componentes do produto, detalhe da oportunidade, sessão (Sair) e a apresentação (estado por função pura).
