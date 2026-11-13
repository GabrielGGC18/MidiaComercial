import {
  ChevronsLeft,
  ChevronsRight,
  Ellipsis,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  SearchX,
  Shield,
  Sparkles,
  Bot,
  Contact,
  Smartphone,
  Sun,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { mensagemErro } from "@/api/client";
import { useAuth } from "@/api/sessao";
import { DemoRibbon, Logo, StoreSwitcher } from "@/components/midia/marca";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { rotaInicial } from "@/lib/permissions";
import AgenteChat from "@/features/agente/AgenteChat";
import { useTema } from "@/lib/tema";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", rotulo: "Oportunidades", Icone: LayoutDashboard, fim: true },
  { to: "/importar", rotulo: "Importar dados", Icone: Upload },
  { to: "/publico", rotulo: "Meu público", Icone: Users },
  { to: "/demanda", rotulo: "Procuraram e não tinha", Icone: SearchX },
  { to: "/acoes", rotulo: "Plano de ação", Icone: ListChecks },
  { to: "/agente", rotulo: "Agente de vendas", Icone: Bot },
  { to: "/clientes", rotulo: "Clientes", Icone: Contact },
  { to: "/balcao", rotulo: "Balcão", Icone: Smartphone },
];

const NAV_MOBILE = [
  { to: "/", rotulo: "Início", Icone: LayoutDashboard, fim: true },
  { to: "/demanda", rotulo: "Demanda", Icone: SearchX },
  { to: "/acoes", rotulo: "Ações", Icone: ListChecks },
];

export default function AppShell() {
  const { me, sair, trocarLoja } = useAuth();
  const { tema, alternar } = useTema();
  const nav = useNavigate();
  const local = useLocation();
  const [recolhida, setRecolhida] = useState(() => localStorage.getItem("mc-sidebar") === "1");
  const [mais, setMais] = useState(false);
  const [ia, setIa] = useState(false);

  useEffect(() => localStorage.setItem("mc-sidebar", recolhida ? "1" : "0"), [recolhida]);
  useEffect(() => setMais(false), [local.pathname]);

  const trocar = async (id: number) => {
    try {
      const novo = await trocarLoja(id);
      toast.success(`Agora em ${novo.loja?.nome}`);
      nav(rotaInicial(novo.papel), { replace: true });
    } catch (e) {
      toast.error(mensagemErro(e));
    }
  };
  const logout = async () => {
    await sair();
    nav("/login", { replace: true });
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
      isActive
        ? "bg-violeta-50 text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      recolhida && "justify-center px-0",
    );

  const IconeTema = tema === "escuro" ? Sun : Moon;

  return (
    <div className="min-h-dvh">
      {me?.loja?.demo && <DemoRibbon />}
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-card focus:p-2">
        Pular para o conteúdo
      </a>

      {/* Sidebar desktop: 264 px, recolhe para 72 px */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
          me?.loja?.demo ? "top-7" : "top-0",
          recolhida ? "w-[72px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex h-16 items-center px-5", recolhida && "justify-center px-0")}>
          <Logo compacto={recolhida} />
        </div>
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {NAV.map(({ to, rotulo, Icone, fim }) => (
            <NavLink key={to} to={to} end={fim} className={linkCls} title={recolhida ? rotulo : undefined}>
              <Icone className="size-[18px] shrink-0" aria-hidden />
              {!recolhida && <span className="truncate">{rotulo}</span>}
            </NavLink>
          ))}
          {me?.usuario.is_staff && (
            <a href="/admin/" className={linkCls({ isActive: false })} title={recolhida ? "Administração" : undefined}>
              <Shield className="size-[18px] shrink-0" aria-hidden />
              {!recolhida && <span>Administração</span>}
            </a>
          )}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <StoreSwitcher lojas={me?.lojas ?? []} atual={me?.loja ?? null} onTrocar={trocar} compacto={recolhida} />
          <div className={cn("flex items-center gap-1", recolhida ? "flex-col" : "justify-between")}>
            {!recolhida && <span className="truncate px-1 text-xs text-muted-foreground">{me?.usuario.nome}</span>}
            <div className={cn("flex", recolhida && "flex-col")}>
              <button type="button" onClick={alternar} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}>
                <IconeTema className="size-4" />
              </button>
              <button type="button" onClick={logout} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted" aria-label="Sair">
                <LogOut className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setRecolhida((v) => !v)}
                className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
              >
                {recolhida ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">
        <Logo />
        <span className="max-w-[45%] truncate text-xs font-medium text-muted-foreground">{me?.loja?.nome}</span>
      </header>

      <main
        id="conteudo"
        className={cn(
          "mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8",
          recolhida ? "lg:ml-[72px] lg:pl-10" : "lg:ml-[264px] lg:pl-10",
        )}
      >
        <Outlet />
      </main>

      {/* Menu inferior mobile: Início, Demanda, Ações, Mais */}
      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV_MOBILE.map(({ to, rotulo, Icone, fim }) => (
          <NavLink
            key={to}
            to={to}
            end={fim}
            className={({ isActive }) =>
              cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", isActive ? "text-primary" : "text-muted-foreground")
            }
          >
            <Icone className="size-5" aria-hidden />
            {rotulo}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMais(true)} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Ellipsis className="size-5" aria-hidden />
          Mais
        </button>
      </nav>

      {/* Preencher com IA (docs/01 T8): gaveta lateral no desktop, inferior no celular */}
      {local.pathname !== "/agente" && (
        <button
          type="button"
          onClick={() => setIa(true)}
          className="fixed bottom-20 right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-violeta-500 px-4 text-sm font-semibold text-white shadow-md hover:bg-violeta-600 lg:bottom-6 lg:right-6"
        >
          <Sparkles className="size-4" aria-hidden /> Preencher com IA
        </button>
      )}
      <Dialog open={ia} onOpenChange={setIa}>
        <DialogContent lado="direita" aria-describedby={undefined} className="flex flex-col max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:h-[85dvh] max-lg:max-w-none max-lg:rounded-b-none max-lg:rounded-t-xl">
          <DialogTitle className="mb-3 flex items-center gap-2"><Sparkles className="size-4 text-violeta-500" aria-hidden /> Preencher com IA</DialogTitle>
          <AgenteChat className="min-h-0 flex-1" />
        </DialogContent>
      </Dialog>

      <Dialog open={mais} onOpenChange={setMais}>
        <DialogContent lado="baixo" aria-describedby={undefined}>
          <DialogTitle className="mb-4">Mais</DialogTitle>
          <nav className="flex flex-col gap-1">
            {NAV.filter((n) => !NAV_MOBILE.some((m) => m.to === n.to)).map(({ to, rotulo, Icone }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn(linkCls({ isActive }), "h-12 justify-start px-3")}>
                <Icone className="size-5" aria-hidden />
                {rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            <StoreSwitcher lojas={me?.lojas ?? []} atual={me?.loja ?? null} onTrocar={trocar} />
            <div className="flex gap-2">
              <button type="button" onClick={alternar} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm">
                <IconeTema className="size-4" aria-hidden /> Tema {tema === "escuro" ? "claro" : "escuro"}
              </button>
              <button type="button" onClick={logout} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border text-sm">
                <LogOut className="size-4" aria-hidden /> Sair
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
