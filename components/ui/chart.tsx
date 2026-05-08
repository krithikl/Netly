"use client";

import type { HTMLAttributes } from "react";
import { formatMoney } from "@/lib/insights";
import { cn } from "@/lib/utils";

type ChartContainerProps = HTMLAttributes<HTMLDivElement>;

export function ChartContainer({ className, ...props }: ChartContainerProps) {
  return <div className={cn("h-full w-full", className)} data-chart="" {...props} />;
}

type ChartTooltipPayload = {
  name?: string;
  value?: number | string;
};

type ChartTooltipContentProps = {
  active?: boolean;
  className?: string;
  payload?: ChartTooltipPayload[];
  total?: number;
};

export function ChartTooltipContent({ active, className, payload, total }: ChartTooltipContentProps) {
  const item = payload?.[0];

  if (!active || !item) {
    return null;
  }

  const amount = Number(item.value || 0);
  const percent = total && total > 0 ? Math.round((amount / total) * 100) : 0;

  return (
    <div
      className={cn(
        "grid min-w-[150px] gap-1 rounded-2xl border border-[var(--outline)] bg-[var(--surface)] px-4 py-3 text-center text-[var(--ink)] shadow-[0_14px_30px_rgba(29,27,32,0.16)]",
        className
      )}
    >
      <strong className="text-sm">{item.name}</strong>
      <span className="text-lg font-black">{formatMoney(amount)}</span>
      <small className="text-xs font-semibold text-[var(--muted)]">{percent}% of shown expenses</small>
    </div>
  );
}
