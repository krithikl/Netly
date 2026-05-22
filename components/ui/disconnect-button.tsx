import { LogOut } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shared destructive-looking disconnect action used for external service links.
export function DisconnectButton({ children, className, ...props }: ButtonProps) {
  return (
    <Button
      className={cn(
        "border border-[rgba(255,125,145,0.38)] bg-[rgba(255,125,145,0.14)] text-[var(--danger)] shadow-none hover:bg-[rgba(255,125,145,0.22)] hover:text-[var(--danger)] focus-visible:bg-[rgba(255,125,145,0.22)]",
        className
      )}
      type="button"
      variant="secondary"
      {...props}
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {children}
    </Button>
  );
}
