// Navegação pública em pílula flutuante (ref. visual: nav central com ação branca em destaque).
import { ArrowLeft, ChevronRight, LayoutDashboard, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/api/sessao";
import { LogoAnimado } from "@/components/midia/marca";
import { rotaInicial } from "@/lib/permissions";
import { useTema } from "@/lib/tema";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#percurso", rotulo: "Demonstração" },
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#plataforma", rotulo: "Plataforma" },
  { href: "#sobre", rotulo: "Quem somos" },
];

const COR_CAPITULO: Record<string, string> = {
  noite: "border-white/10 bg-tinta-950/80",
  coral: "border-coral-500/50 bg-[#2a0f08]/85",
  violeta: "border-violeta-300/40 bg-violeta-900/85",
  claro: "border-white/15 bg-tinta-900/85",
};

const BRANCO = "inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-tinta-950 shadow-sm transition-colors hover:bg-tinta-50";

/** Cabeçalho das páginas públicas: início (/) e login (/login). */
export function CabecalhoPublico({ pagina }: { pagina: "inicio" | "login" }) {
  const { me } = useAuth();
  const { tema, alternar } = useTema();
  const [menu, setMenu] = useState(false);
  const [capitulo, setCapitulo] = useState("noite");

  // A nav assume a cor do capítulo que está passando por baixo dela
  useEffect(() => {
    if (pagina !== "inicio" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && setCapitulo((e.target as HTMLElement).dataset.capitulo ?? "noite")),
      { rootMargin: "-40px 0px -92% 0px" },
    );
    document.querySelectorAll("[data-capitulo]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pagina]);
  const IconeTema = tema === "escuro" ? Sun : Moon;

  useEffect(() => {
    if (!menu) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [menu]);

  const acao =
    pagina === "login" ? (
      <Link to="/" className={BRANCO}>
        <ArrowLeft className="size-4" aria-hidden /> Início
      </Link>
    ) : me ? (
      <Link to={me.loja ? rotaInicial(me.papel) : "/lojas"} className={BRANCO}>
        <LayoutDashboard className="size-4" aria-hidden /> Abrir painel
      </Link>
    ) : (
      <Link to="/login" className={BRANCO}>
        Entrar <ChevronRight className="size-4" aria-hidden />
      </Link>
    );

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-tinta-950/70 px-3 text-tinta-50 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl md:justify-center md:gap-2 md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-0">
        <Link to="/" aria-label="MidiaComercial, página inicial" className="rounded-xl md:mr-1 md:grid md:size-10 md:place-items-center md:bg-tinta-950/80 md:backdrop-blur-xl">
          <LogoAnimado compacto />
        </Link>
        {pagina === "inicio" && (
          <nav aria-label="Seções" className={cn("hidden h-10 items-center rounded-xl border p-1 text-sm font-medium backdrop-blur-xl transition-colors duration-500 md:flex", COR_CAPITULO[capitulo] ?? COR_CAPITULO.noite)}>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="rounded-lg px-3.5 py-1.5 text-tinta-300 transition-colors hover:bg-white/10 hover:text-white">
                {l.rotulo}
              </a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {acao}
          <button
            type="button"
            onClick={alternar}
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-tinta-950/80 text-tinta-300 backdrop-blur-xl hover:text-white"
            aria-label={tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"}
          >
            <IconeTema className="size-4" />
          </button>
          {pagina === "inicio" && (
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              aria-controls="menu-publico"
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-tinta-950/80 text-tinta-100 md:hidden"
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
            >
              {menu ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          )}
        </div>
      </div>
      {menu && (
        <nav id="menu-publico" aria-label="Seções" className="mx-auto mt-2 w-full max-w-[1280px] rounded-2xl border border-white/10 bg-tinta-950/95 p-2 text-tinta-50 backdrop-blur-xl md:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenu(false)}
              className={cn("flex h-12 items-center justify-between border-b border-white/10 px-3 text-base last:border-0")}
            >
              {l.rotulo} <ChevronRight className="size-4 text-tinta-300" aria-hidden />
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
