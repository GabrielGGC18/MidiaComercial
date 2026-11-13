import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-border bg-card px-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-tinta-300 hover:border-tinta-300 focus-visible:border-violeta-300 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-erro";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, "h-11", className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-24 py-2.5", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(base, "h-11 cursor-pointer pr-8", className)} {...props} />
  ),
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-foreground", className)} {...props} />;
}

export function Field({
  label,
  erro,
  ajuda,
  htmlFor,
  children,
  className,
}: {
  label: string;
  erro?: string;
  ajuda?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {erro ? (
        <p role="alert" className="text-xs text-erro-tx dark:text-erro">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-xs text-muted-foreground">{ajuda}</p>
      ) : null}
    </div>
  );
}
