import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  actionLabel?: string;
  icon: LucideIcon;
  label: string;
  note: string;
  onAction?: () => void;
  tone: "blue" | "green" | "orange" | "red";
  value: string;
};

const metricToneClassNames: Record<MetricCardProps["tone"], string> = {
  blue: "bg-[rgba(137,168,255,0.12)] text-[var(--info)]",
  green: "bg-[rgba(117,208,141,0.13)] text-[var(--success)]",
  orange: "bg-[rgba(229,184,107,0.14)] text-[var(--warning)]",
  red: "bg-[rgba(255,125,145,0.12)] text-[var(--danger)]"
};

// Small reusable metric card used on the Home dashboard.
export function MetricCard({ actionLabel, icon: Icon, label, note, onAction, tone, value }: MetricCardProps) {
  return (
    <Card className="grid min-h-[148px] grid-cols-[54px_minmax(0,1fr)] items-start gap-4 rounded-[18px] border border-[var(--outline-soft)] bg-[var(--surface)] px-[22px] py-[26px] shadow-none animate-[card-in_var(--motion-medium)_var(--motion-ease)_both] max-[768px]:min-h-[136px] max-[768px]:grid-cols-[42px_minmax(0,1fr)] max-[768px]:px-4 max-[768px]:py-[18px] max-[600px]:min-h-[126px] max-[600px]:p-4">
      <span className={cn("grid h-[52px] w-[52px] place-items-center rounded-full max-[768px]:h-10 max-[768px]:w-10", metricToneClassNames[tone])}>
        <Icon aria-hidden="true" size={22} strokeWidth={2.4} />
      </span>
      <div>
        <span className="mb-2.5 block text-[0.82rem] font-[850] text-[var(--muted)]">{label}</span>
        <strong className="block text-[1.55rem] leading-none font-[920] tabular-nums">{value}</strong>
        <p className="mt-3 text-[0.82rem] leading-[1.45] text-[var(--ink)]">{note}</p>
        {actionLabel && onAction && (
          <button className="mt-3 w-fit cursor-pointer rounded-[10px] border border-[var(--primary-border)] bg-[var(--primary-soft)] px-2.5 py-1.5 text-[0.78rem] font-[850] text-[var(--accent-cream)] hover:bg-white hover:text-[var(--primary-hover)]" onClick={onAction} type="button">
            {actionLabel}
          </button>
        )}
      </div>
    </Card>
  );
}
