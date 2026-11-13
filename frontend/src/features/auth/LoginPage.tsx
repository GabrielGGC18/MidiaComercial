import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, Smartphone } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { mensagemErro } from "@/api/client";
import { FundoGrade, TituloAnimado } from "@/components/midia/destaques";
import { Logo } from "@/components/midia/marca";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { rotaInicial } from "@/lib/permissions";
import { useAuth } from "@/api/sessao";

const schema = z.object({
  username: z.string().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});
type Form = z.infer<typeof schema>;

function PainelOndas() {
  return (
    <div className="relative isolate hidden overflow-hidden bg-violeta-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <FundoGrade className="-z-10 text-violeta-300" />
      <svg className="absolute inset-0 h-full w-full opacity-70" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden fill="none">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M-20 ${300 + i * 40} C 120 ${220 + i * 40}, 220 ${420 + i * 40}, 360 ${330 + i * 40} S 560 ${260 + i * 40}, 640 ${340 + i * 40}`}
            stroke={i === 6 ? "var(--color-coral-500)" : "var(--color-violeta-300)"}
            strokeOpacity={i === 6 ? 0.9 : 0.15 + i * 0.05}
            strokeWidth={i === 6 ? 2.5 : 1.5}
          />
        ))}
      </svg>
      <div className="relative">
        <p className="sobretitulo text-violeta-300">Hackrun · Palmas</p>
      </div>
      <div className="relative max-w-md">
        <p className="font-display text-h1 font-extrabold text-white">
          <TituloAnimado texto="Seus sinais de venda, em uma só mídia." />
        </p>
        <p className="mt-4 text-base text-violeta-100">
          O que vendeu, o que procuraram e não tinha, o que está parado no estoque e o que a equipe decidiu fazer.
          Tudo com evidência, amostra e limitação à vista.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { me, entrar } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const [erro, setErro] = useState<string | null>(null);
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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="relative isolate flex flex-col justify-center px-6 py-10 sm:px-12">
        <FundoGrade className="-z-10 lg:hidden" />
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-10 font-display text-h1 font-bold">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acesse o painel da sua loja.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-4" noValidate>
            <Field label="Usuário" htmlFor="username" erro={formState.errors.username?.message}>
              <Input id="username" autoComplete="username" autoFocus {...register("username")} aria-invalid={!!formState.errors.username} />
            </Field>
            <Field label="Senha" htmlFor="password" erro={formState.errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} aria-invalid={!!formState.errors.password} />
            </Field>
            {erro && (
              <p role="alert" className="rounded-md bg-erro-bg px-3 py-2 text-sm text-erro-tx dark:bg-erro/10 dark:text-erro">
                {erro}
              </p>
            )}
            <Button type="submit" size="lg" carregando={formState.isSubmitting}>
              <LogIn aria-hidden /> Entrar
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-violeta-300 bg-card p-4 shadow-bloco">
            <p className="sobretitulo text-violeta-700 dark:text-violeta-100">Entrar na demo</p>
            <p className="mt-1 text-xs text-muted-foreground">Dados 100% sintéticos de duas lojas de moda em Palmas.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo("gerente.centro")} disabled={formState.isSubmitting}>
                Gerente (Centro)
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => demo("ana")} disabled={formState.isSubmitting}>
                <Smartphone aria-hidden /> Atendente (balcão)
              </Button>
            </div>
          </div>
        </div>
      </main>
      <PainelOndas />
    </div>
  );
}
