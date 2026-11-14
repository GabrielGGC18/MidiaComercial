// Navegação pública: uma barra de vidro só (logo · seções · ações). O tom segue o capítulo que passa
// por baixo e o tema: vidro escuro sobre seção escura, vidro claro sobre seção clara (tema claro).
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
  { href: "#diferenciais", rotulo: "Como ajuda" },
  { href: "#rotina", rotulo: "Na rotina" },
  { href: "#sobre", rotulo: "Equipe" },
];

type Capitulo = "noite" | "coral" | "violeta" | "claro";

/** Tom da barra por capítulo (escuro) e o vidro claro para seções claras no tema claro. */
const TOM_ESCURO: Record<Capitulo, string> = {
  noite: "border-white/10 bg-tinta-950/70",
  coral: "border-coral-500/30 bg-[#1c0d0a]/80",
  violeta: "border-violeta-300/25 bg-[#15123f]/80",
  claro: "border-white/10 bg-tinta-950/80",
};
const TOM_CLARO = "border-tinta-200/80 bg-white/80";

export function CabecalhoPublico({ pagina }: { pagina: "inicio" | "login" }) {
  const { me } = useAuth();
  const { tema, alternar } = useTema();
  const [menu, setMenu] = useState(false);
  const [capitulo, setCapitulo] = useState<Capitulo>("noite");
  const IconeTema = tema === "escuro" ? Sun : Moon;

  // A barra assume o tom do capítulo que está passando por baixo dela
  useEffect(() => {
    if (pagina !== "inicio" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && setCapitulo(((e.target as HTMLElement).dataset.capitulo as Capitulo) ?? "noite")),
      { rootMargin: "-40px 0px -92% 0px" },
    );
    document.querySelectorAll("[data-capitulo]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pagina]);

  useEffect(() => {
    if (!menu) return;
    const fechar = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [menu]);

  // vidro claro só sobre seção clara no tema claro (no login, segue o tema)
  const claro = tema === "claro" && (pagina === "login" || capitulo === "claro");
  const tom = claro ? TOM_CLARO : TOM_ESCURO[capitulo];
  const texto = claro ? "text-tinta-900" : "text-white";
  const link = claro ? "text-tinta-700 hover:bg-tinta-100 hover:text-tinta-950" : "text-tinta-200 hover:bg-white/10 hover:text-white";
  const icone = claro
    ? "border-tinta-200 bg-white text-tinta-700 hover:text-tinta-950"
    : "border-white/10 bg-white/5 text-tinta-200 hover:bg-white/10 hover:text-white";
  const principal = claro ? "bg-tinta-950 text-white hover:bg-tinta-800" : "bg-white text-tinta-950 hover:bg-tinta-50";
  const botao = "inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors";

  const acao =
    pagina === "login" ? (
      <Link to="/" className={cn(botao, principal)}>
        <ArrowLeft className="size-4" aria-hidden /> Início
      </Link>
    ) : me ? (
      <Link to={me.loja ? rotaInicial(me.papel) : "/lojas"} className={cn(botao, principal)}>
        <LayoutDashboard className="size-4" aria-hidden /> <span className="max-[380px]:sr-only">Abrir painel</span>
      </Link>
    ) : (
      <Link to="/login" className={cn(botao, "gap-1 px-4", principal)}>
        Entrar <ChevronRight className="size-4" aria-hidden />
      </Link>
    );

  return (
    <header className="sticky top-0 z-nav px-3 pt-3">
      <div
        className={cn(
          "mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2 rounded-2xl border pl-3 pr-2 shadow-[0_10px_40px_-22px_rgb(0_0_0/0.7)] backdrop-blur-xl transition-colors duration-500 sm:pl-4",
          tom,
          texto,
        )}
      >
        <Link to="/" aria-label="MidiaComercial, página inicial" className="flex min-w-0 shrink-0 items-center rounded-lg pr-1">
          <LogoAnimado compacto sobreEscuro={!claro} classeNome="max-[359px]:hidden" />
        </Link>

        {pagina === "inicio" && (
          <nav aria-label="Seções" className="mx-auto hidden items-center gap-0.5 text-sm font-medium lg:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className={cn("rounded-lg px-3.5 py-2 transition-colors", link)}>
                {l.rotulo}
              </a>
            ))}
          </nav>
        )}

        <div className={cn("ml-auto flex shrink-0 items-center gap-1.5", pagina === "inicio" && "lg:ml-0")}>
          {acao}
          <button
            type="button"
            onClick={alternar}
            className={cn("size-10 place-items-center rounded-xl border transition-colors", pagina === "inicio" ? "hidden sm:grid" : "grid", icone)}
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
              className={cn("grid size-10 place-items-center rounded-xl border transition-colors lg:hidden", icone)}
              aria-label={menu ? "Fechar menu" : "Abrir menu"}
            >
              {menu ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {menu && (
        <nav
          id="menu-publico"
          aria-label="Seções"
          className={cn(
            "mx-auto mt-2 w-full max-w-[1280px] rounded-2xl border p-2 shadow-lg backdrop-blur-xl lg:hidden",
            claro ? "border-tinta-200 bg-white/95 text-tinta-900" : "border-white/10 bg-tinta-950/95 text-white",
          )}
        >
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenu(false)}
              className={cn(
                "flex h-12 items-center justify-between rounded-lg border-b px-3 text-base last:border-0",
                claro ? "border-tinta-100 hover:bg-tinta-50" : "border-white/10 hover:bg-white/5",
              )}
            >
              {l.rotulo} <ChevronRight className={cn("size-4", claro ? "text-tinta-500" : "text-tinta-300")} aria-hidden />
            </a>
          ))}
          {/* no celular, o tema fica aqui para a barra caber em 320 px */}
          <button
            type="button"
            onClick={alternar}
            className={cn("flex h-12 w-full items-center justify-between rounded-lg px-3 text-base sm:hidden", claro ? "hover:bg-tinta-50" : "hover:bg-white/5")}
          >
            {tema === "escuro" ? "Usar tema claro" : "Usar tema escuro"} <IconeTema className="size-4" aria-hidden />
          </button>
        </nav>
      )}
    </header>
  );
}
