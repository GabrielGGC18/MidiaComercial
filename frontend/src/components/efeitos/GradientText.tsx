// Inspirado em React Bits "GradientText" (MIT + Commons Clause): versão estática, só CSS e tokens da marca.
// Para texto animado, use a classe `efeito-texto-gradiente` no próprio elemento que anima (ver RotatingText).
import { cn } from "@/lib/utils";

export const CLASSE_GRADIENTE = "efeito-texto-gradiente";

export function GradientText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn(CLASSE_GRADIENTE, className)}>{children}</span>;
}
