import { useCallback, useEffect, useState } from "react";

export type Tema = "claro" | "escuro";

export function useTema() {
  const [tema, setTema] = useState<Tema>(() =>
    document.documentElement.classList.contains("dark") ? "escuro" : "claro",
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", tema === "escuro");
    try {
      localStorage.setItem("mc-tema", tema);
    } catch {
      /* modo privado */
    }
  }, [tema]);
  const alternar = useCallback(() => setTema((t) => (t === "escuro" ? "claro" : "escuro")), []);
  return { tema, alternar };
}
