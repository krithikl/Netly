import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn("min-h-24 w-full rounded-2xl border border-[var(--outline)] bg-[rgba(255,251,255,0.9)] px-3 py-2 text-sm text-[var(--ink)] shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,166,147,0.28)] disabled:cursor-not-allowed disabled:opacity-50", className)}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
