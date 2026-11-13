import { ArrowLeft, LogOut } from "lucide-react";
import { Link, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/api/sessao";
import { DemoRibbon, LogoIcone } from "@/components/midia/marca";
import { temPapel } from "@/lib/permissions";

/** Layout mínimo, mobile, para o atendente (uma mão, alvos grandes). */
export default function BalcaoShell() {
  const { me, sair } = useAuth();
  const nav = useNavigate();
  return (
    <div className="min-h-dvh">
      {me?.loja?.demo && <DemoRibbon />}
      <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        {temPapel(me?.papel, "gerente") ? (
          <Link to="/demanda" className="grid size-10 place-items-center rounded-md hover:bg-muted" aria-label="Voltar ao painel">
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <LogoIcone />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{me?.loja?.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{me?.usuario.nome}</p>
        </div>
        <button
          type="button"
          onClick={() => sair().then(() => nav("/", { replace: true }))}
          className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Sair"
        >
          <LogOut className="size-5" />
        </button>
      </header>
      <main className="mx-auto max-w-md px-4 pb-10 pt-5">
        <Outlet />
      </main>
    </div>
  );
}
