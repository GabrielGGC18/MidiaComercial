import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { CardSkeleton } from "@/components/midia/estado";
import { RequireLoja, RequireLogin } from "@/features/auth/guards";
import LoginPage from "@/features/auth/LoginPage";
import LojasPage from "@/features/auth/LojasPage";
import AppShell from "./layouts/AppShell";
import BalcaoShell from "./layouts/BalcaoShell";

// Telas pesadas (gráficos) carregam sob demanda
const OportunidadesPage = lazy(() => import("@/features/oportunidades/OportunidadesPage"));
const ImportarPage = lazy(() => import("@/features/importacao/ImportarPage"));
const PublicoPage = lazy(() => import("@/features/publico/PublicoPage"));
const DemandaPage = lazy(() => import("@/features/demanda/DemandaPage"));
const BalcaoPage = lazy(() => import("@/features/demanda/BalcaoPage"));
const AcoesPage = lazy(() => import("@/features/acoes/AcoesPage"));
const AcaoDetalhePage = lazy(() => import("@/features/acoes/AcaoDetalhePage"));
const ClientesPage = lazy(() => import("@/features/clientes/ClientesPage"));
const AgentePage = lazy(() => import("@/features/agente/AgentePage"));

const s = (el: React.ReactNode) => (
  <Suspense fallback={<div className="grid gap-4"><CardSkeleton /><CardSkeleton /></div>}>{el}</Suspense>
);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireLogin />,
    children: [{ path: "/lojas", element: <LojasPage /> }],
  },
  {
    // Balcão: atendente (+ todos)
    element: <RequireLoja papel="atendente" />,
    children: [{ element: <BalcaoShell />, children: [{ path: "/balcao", element: s(<BalcaoPage />) }] }],
  },
  {
    element: <RequireLoja papel="gerente" />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: s(<OportunidadesPage />) },
          { path: "/importar", element: s(<ImportarPage />) },
          { path: "/publico", element: s(<PublicoPage />) },
          { path: "/demanda", element: s(<DemandaPage />) },
          { path: "/acoes", element: s(<AcoesPage />) },
          { path: "/acoes/:id", element: s(<AcaoDetalhePage />) },
          { path: "/clientes", element: s(<ClientesPage />) },
          { path: "/agente", element: s(<AgentePage />) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
