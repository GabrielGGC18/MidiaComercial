import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { ApiError } from "@/api/client";
import { AuthProvider } from "@/api/sessao";

function tratarGlobal(e: unknown, qc: QueryClient) {
  if (!(e instanceof ApiError)) return;
  // sessão caiu ou loja sumiu da sessão: recarrega /me; os guards redirecionam
  if (e.status === 401 || e.corpo.codigo === "sem_loja") void qc.invalidateQueries({ queryKey: ["me"] });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => {
    const client: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError: (e) => tratarGlobal(e, client) }),
      mutationCache: new MutationCache({ onError: (e) => tratarGlobal(e, client) }),
      defaultOptions: {
        queries: {
          retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
          refetchOnWindowFocus: false,
          staleTime: 30_000,
        },
      },
    });
    return client;
  });
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster richColors position="top-center" closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
    </QueryClientProvider>
  );
}
