import { ArrowLeft, LayoutDashboard, LogIn, Moon, Sun } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "@/api/sessao";
import { LogoAnimado } from "@/components/midia/marca";
import { rotaInicial } from "@/lib/permissions";
import { useTema } from "@/lib/tema";

const LINKS = [
  { href: "#percurso", rotulo: "Percurso" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#segmentos", rotulo: "Para quem" },
  { href: "#sobre", rotulo: "Quem somos" },
];

const BOTAO = "inline-flex h-10 items-center gap-2 rounded-md bg-violeta-500 px-4 text-sm font-semibold text-white hover:bg-violeta-600";

/** Cabeçalho das páginas públicas: início (/) e login (/login). */
export function CabecalhoPublico({ pagina }: { pagina: "inicio" | "login" }) {
  const { me } = useAuth();
  const { tema, alternar } = useTema();
  const IconeTema = tema === "escuro" ? Sun : Moon;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="MidiaComercial, página inicial">
          <LogoAnimado compacto />
        </Link>
        {pagina === "inicio" && (
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.rotulo}
              </a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {pagina === "login" ? (
            <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden /> Voltar ao início
            </Link>
          ) : me ? (
            <Link to={me.loja ? rotaInicial(me.papel) : "/lojas"} className={BOTAO}>
              <LayoutDashboard className="size-4" aria-hidden /> Abrir painel
            </Link>
          ) : (
            <Link to="/login" className={BOTAO}>
              <LogIn className="size-4" aria-hidden /> Entrar
            </Link>
          )}
          <button
            type="button"
            onClick={alternar}
            className="grid size-10 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          >
            <IconeTema className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
