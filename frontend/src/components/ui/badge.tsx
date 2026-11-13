import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border border-current/15 px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5",
  {
    variants: {
      tom: {
        neutro: "bg-muted text-muted-foreground",
        violeta: "bg-violeta-50 text-violeta-700 dark:bg-violeta-900/50 dark:text-violeta-100",
        coral: "bg-coral-100 text-coral-700 dark:bg-coral-700/25 dark:text-coral-100",
        ok: "bg-sinal-ok-bg text-sinal-ok-tx dark:bg-sinal-ok/15 dark:text-sinal-ok",
        atencao: "bg-sinal-atencao-bg text-sinal-atencao-tx dark:bg-sinal-atencao/15 dark:text-sinal-atencao",
        bloqueado: "bg-sinal-bloqueado-bg text-sinal-bloqueado-tx dark:bg-tinta-800 dark:text-tinta-300",
        erro: "bg-erro-bg text-erro-tx dark:bg-erro/15 dark:text-erro",
        info: "bg-info-bg text-info-tx dark:bg-info/15 dark:text-info",
      },
    },
    defaultVariants: { tom: "neutro" },
  },
);

export type BadgeTom = NonNullable<VariantProps<typeof badgeVariants>["tom"]>;

export function Badge({
  className,
  tom,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tom }), className)} {...props} />;
}
