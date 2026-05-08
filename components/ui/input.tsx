import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      className={cn("h-10 w-full rounded-full border border-[var(--outline)] bg-[rgba(255,251,255,0.86)] px-3 py-2 text-sm text-[var(--ink)] shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,166,147,0.28)] disabled:cursor-not-allowed disabled:opacity-50", className)}
      ref={ref}
      type={type}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
