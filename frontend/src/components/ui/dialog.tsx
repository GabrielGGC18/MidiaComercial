import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  children,
  lado,
  ...props
}: React.ComponentProps<typeof D.Content> & { lado?: "centro" | "baixo" | "direita" }) {
  const posicao = {
    centro:
      "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl",
    baixo: "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]",
    direita: "inset-y-0 right-0 w-full max-w-md rounded-l-xl",
  }[lado ?? "centro"];
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-tinta-950/50 backdrop-blur-[2px] data-[state=open]:animate-[entrar_150ms_ease-out]" />
      <D.Content
        className={cn(
          "fixed z-50 overflow-y-auto border border-border bg-card p-6 text-card-foreground shadow-md data-[state=open]:animate-entrar",
          posicao,
          className,
        )}
        {...props}
      >
        {children}
        <D.Close
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1 pr-8", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof D.Title>) {
  return <D.Title className={cn("font-display text-h3 font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof D.Description>) {
  return <D.Description className={cn("text-[13px] text-muted-foreground", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
  );
}
