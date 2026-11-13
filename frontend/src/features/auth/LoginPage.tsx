import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Moon, Smartphone, Sun } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { mensagemErro } from "@/api/client";
import { useAuth } from "@/api/sessao";
import { AcaoPrincipal, CartaoExploravel, FundoAurora } from "@/components/midia/destaques";
import {
  ComoFunciona,
  FaixaFuncoes,
  FraseSinais,
  Hero,
  PainelEntrada,
  RodapeLogin,
  Segmentos,
  SobreNos,
} from "@/components/midia/institucional";
import { LogoAnimado } from "@/components/midia/marca";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { rotaInicial } from "@/lib/permissions";
import { useTema } from "@/lib/tema";

const schema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});
type Form = z.infer<typeof schema>;

const LINKS = [
  { href: "#sobre", rotulo: "Quem somos" },
  { href: "#entrar", rotulo: "Entrar" },
  { href: "#segmentos", rotulo: "Segmentos" },
  { href: "#como-funciona", rotulo: "Como funciona" },
];

export default function LoginPage() {
  const { me, entrar } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const { tema, alternar } = useTema();
  const [erro, setErro] = useState<string | null>(null);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const { register, handleSubmit, setValue, formState } = useForm<Form>({ resolver: zodResolver(schema) });

  if (me) return <Navigate to={me.loja ? rotaInicial(me.papel) : "/lojas"} replace />;

  const onSubmit = async (f: Form) => {
    setErro(null);
    try {
      const novo = await entrar(f.username, f.password);
      const de = (local.state as { de?: string } | null)?.de;
      nav(!novo.loja ? "/lojas" : de && de !== "/login" ? de : rotaInicial(novo.papel), { replace: true });
    } catch (e) {
      setErro(mensagemErro(e));
    }
  };

  const demo = (u: string) => {
    setValue("username", u);
    setValue("password", "demo1234");
    void handleSubmit(onSubmit)();
  };

  const IconeTema = tema === "escuro" ? Sun : Moon;

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip scroll-smooth">
      <FundoAurora className="fixed -z-10" />

      {/* Navegação pública */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <a href="#topo" aria-label="MidiaComercial, voltar ao início">
            <LogoAnimado compacto />
          </a>
          <nav aria-label="Seções" className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.rotulo}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href="#entrar" className="inline-flex h-10 items-center gap-2 rounded-md bg-violeta-500 px-4 text-sm font-semibold text-white hover:bg-violeta-600">
              <LogIn className="size-4" aria-hidden /> Entrar
            </a>
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

      <main id="topo">
        <Hero />
        <FaixaFuncoes />
        <SobreNos />

        {/* Entrar: foto + card de login */}
        <section id="entrar" aria-labelledby="entrar-titulo" className="mx-auto grid w-full max-w-6xl scroll-mt-20 items-stretch gap-6 px-5 pb-20 sm:px-8 lg:grid-cols-2">
          <PainelEntrada />
          <CartaoExploravel className="flex flex-col justify-center rounded-lg border border-border bg-card p-6 shadow-bloco sm:p-9">
            <h2 id="entrar-titulo" className="font-display text-h2 font-extrabold">Entre na sua loja</h2>
            <p className="mt-1 text-sm text-muted-foreground">Veja os sinais e escolha o próximo passo.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4" noValidate>
              <Field label="Usuário" htmlFor="username" erro={formState.errors.username?.message}>
                <Input id="username" autoComplete="username" {...register("username")} aria-invalid={!!formState.errors.username} />
              </Field>
              <Field label="Senha" htmlFor="password" erro={formState.errors.password?.message}>
                <div className="relative">
                  <Input
                    id="password"
                    type={senhaVisivel ? "text" : "password"}
                    autoComplete="current-password"
                    className="pr-12"
                    {...register("password")}
                    aria-invalid={!!formState.errors.password}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground"
                    onClick={() => setSenhaVisivel((v) => !v)}
                    aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={senhaVisivel}
                  >
                    {senhaVisivel ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              </Field>
              {erro && (
                <p role="alert" className="rounded-md bg-erro-bg px-3 py-2 text-sm text-erro-tx dark:bg-erro/10 dark:text-erro">
                  {erro}
                </p>
              )}
              <AcaoPrincipal className="w-full">
                <Button type="submit" size="lg" className="w-full" carregando={formState.isSubmitting}>
                  <LogIn aria-hidden /> Entrar
                </Button>
              </AcaoPrincipal>
            </form>
            <div className="mt-7 border-t border-border pt-5">
              <p className="font-semibold">Conhecer a demonstração</p>
              <p className="mt-1 text-xs text-muted-foreground">Duas lojas de moda, com dados 100% sintéticos.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo("gerente.centro")} disabled={formState.isSubmitting}>
                  Gerente (Centro)
                </Button>
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo("ana")} disabled={formState.isSubmitting}>
                  <Smartphone aria-hidden /> Atendente (balcão)
                </Button>
              </div>
            </div>
          </CartaoExploravel>
        </section>

        <Segmentos />
        <ComoFunciona />
        <FraseSinais />
      </main>
      <RodapeLogin />
    </div>
  );
}
