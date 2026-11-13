import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// Variações: primary · secondary · ghost · danger · balcao (FRONTEND.md §5.1)
export const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-violeta-600",
        secondary:
          "border border-border bg-card text-foreground shadow-xs hover:border-tinta-300 hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-erro text-white shadow-xs hover:bg-erro-tx",
        coral: "bg-coral-500 text-white shadow-xs hover:bg-coral-700",
        balcao:
          "h-14 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground shadow-sm hover:bg-violeta-600 [&_svg]:size-5",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-11",
      },
    },
    compoundVariants: [{ variant: "balcao", class: "h-14 px-6" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  carregando?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, carregando, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...props}
    >
      {carregando && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
