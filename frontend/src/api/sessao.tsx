import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { ApiError, api, garantirCsrf, json } from "@/api/client";
import type { Me } from "@/api/types";

interface AuthCtx {
  me: Me | null;
  carregando: boolean;
  entrar: (username: string, password: string) => Promise<Me>;
  sair: () => Promise<void>;
  trocarLoja: (lojaId: number) => Promise<Me>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function buscarMe(): Promise<Me | null> {
  try {
    return await api<Me>("/api/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: buscarMe, staleTime: 60_000 });

  // Trocar de loja/usuário limpa todo o cache: nunca mistura dados de lojas (§6.3)
  const reiniciar = (me: Me | null) => {
    qc.clear();
    qc.setQueryData(["me"], me);
  };

  const login = useMutation({
    mutationFn: async ({ u, p }: { u: string; p: string }) => {
      await garantirCsrf();
      return api<Me>("/api/auth/login", { method: "POST", body: json({ username: u, password: p }) });
    },
    onSuccess: reiniciar,
  });

  const valor = useMemo<AuthCtx>(
    () => ({
      me: data ?? null,
      carregando: isLoading,
      entrar: (u, p) => login.mutateAsync({ u, p }),
      sair: async () => {
        await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        reiniciar(null);
      },
      trocarLoja: async (lojaId) => {
        const me = await api<Me>("/api/me/loja", { method: "POST", body: json({ loja_id: lojaId }) });
        reiniciar(me);
        return me;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, isLoading],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

/** Chave de cache sempre com o id da loja. */
export function useChaveLoja(...partes: unknown[]) {
  const { me } = useAuth();
  return [...partes, { loja: me?.loja?.id ?? null }] as const;
}
