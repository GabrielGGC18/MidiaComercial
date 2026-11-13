import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Smartphone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { mensagemErro } from "@/api/client";
import { useAuth } from "@/api/sessao";
import { AcaoPrincipal, CartaoExploravel, FundoAurora } from "@/components/midia/destaques";
import { PainelEntrada } from "@/components/midia/institucional";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { rotaInicial } from "@/lib/permissions";
import { CabecalhoPublico } from "@/features/home/CabecalhoPublico";

const schema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const { me, entrar } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
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

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
      <FundoAurora className="fixed -z-10" />

      <CabecalhoPublico pagina="login" />

      <main id="entrar" className="flex flex-1 items-center">
        {/* Entrar: foto + card de login */}
        <section aria-labelledby="entrar-titulo" className="mx-auto grid w-full max-w-6xl items-stretch gap-6 px-5 py-10 sm:px-8 lg:grid-cols-2">
          <PainelEntrada />
          <CartaoExploravel className="flex flex-col justify-center rounded-lg border border-border bg-card p-6 shadow-bloco sm:p-9">
            <h1 id="entrar-titulo" className="font-display text-h2 font-extrabold">Entre na sua loja</h1>
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
      </main>
    </div>
  );
}
