import { ChevronRight, LogOut, Store } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { mensagemErro } from "@/api/client";
import { EmptyState } from "@/components/midia/estado";
import { FundoGrade } from "@/components/midia/destaques";
import { Logo } from "@/components/midia/marca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAPEL_ROTULO, rotaInicial } from "@/lib/permissions";
import { useAuth } from "@/api/sessao";

export default function LojasPage() {
  const { me, trocarLoja, sair } = useAuth();
  const nav = useNavigate();
  const [abrindo, setAbrindo] = useState<number | null>(null);

  const abrir = async (id: number) => {
    setAbrindo(id);
    try {
      const novo = await trocarLoja(id);
      nav(rotaInicial(novo.papel), { replace: true });
    } catch (e) {
      toast.error(mensagemErro(e));
    } finally {
      setAbrindo(null);
    }
  };

  return (
    <main className="relative isolate min-h-dvh overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
      <FundoGrade className="-z-10 text-violeta-500" />
      <div className="mx-auto w-full max-w-lg">
        <div className="flex items-center justify-between">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => sair().then(() => nav("/login"))}>
            <LogOut aria-hidden /> Sair
          </Button>
        </div>
        <h1 className="mt-12 font-display text-h1 font-bold">Qual loja abrir?</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Olá, {me?.usuario.nome}. Escolha a loja para ver os sinais de venda dela. Os dados ficam separados.
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {me?.lojas.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => abrir(l.id)}
                disabled={abrindo !== null}
                className="flex w-full items-center gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-shadow hover:border-violeta-500 hover:shadow-bloco disabled:opacity-60"
              >
                <span className="grid size-11 place-items-center rounded-md bg-violeta-50 text-violeta-700 dark:bg-violeta-900/60 dark:text-violeta-100">
                  <Store className="size-5" aria-hidden />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{l.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {PAPEL_ROTULO[l.papel]} · {l.segmento}
                  </span>
                </span>
                {l.demo && <Badge tom="violeta">DEMO</Badge>}
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {me && me.lojas.length === 0 && (
          <EmptyState
            className="mt-8"
            titulo="Nenhuma loja vinculada"
            descricao="Seu usuário ainda não está ligado a uma loja. Peça ao dono da loja para adicionar você."
          />
        )}
      </div>
    </main>
  );
}
