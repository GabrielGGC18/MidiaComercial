// Inspirado em React Bits "AnimatedList" (MIT + Commons Clause). Usa motion (sem @hugeicons):
// itens novos entram por cima; com reduced motion vira lista simples.
import { AnimatePresence, motion } from "motion/react";
import { useMenosMovimento } from "@/lib/movimento";
import { cn } from "@/lib/utils";

export function AnimatedList<T>({
  itens,
  chave,
  render,
  className,
  rotulo,
}: {
  itens: T[];
  chave: (item: T) => string | number;
  render: (item: T) => React.ReactNode;
  className?: string;
  rotulo?: string;
}) {
  const menos = useMenosMovimento();
  if (menos) {
    return (
      <ul className={className} aria-label={rotulo}>
        {itens.map((i) => (
          <li key={chave(i)}>{render(i)}</li>
        ))}
      </ul>
    );
  }
  return (
    <ul className={cn(className)} aria-label={rotulo}>
      <AnimatePresence initial={false}>
        {itens.map((i) => (
          <motion.li
            key={chave(i)}
            layout
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {render(i)}
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
