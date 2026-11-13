import { Navigate, Outlet, useLocation } from "react-router";
import { Logo } from "@/components/midia/marca";
import { type Papel, rotaInicial, temPapel } from "@/lib/permissions";
import { useAuth } from "@/api/sessao";

function Carregando() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true">
      <Logo className="animate-pulse" />
    </div>
  );
}

/** Exige login e loja escolhida; opcionalmente um papel mínimo. */
export function RequireLoja({ papel }: { papel?: Papel }) {
  const { me, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!me) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  if (!me.loja) return <Navigate to="/lojas" replace />;
  if (papel && !temPapel(me.papel, papel)) return <Navigate to={rotaInicial(me.papel)} replace />;
  return <Outlet />;
}

export function RequireLogin() {
  const { me, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (!me) return <Navigate to="/login" replace />;
  return <Outlet />;
}
