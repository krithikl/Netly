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

export function MetricCard({ actionLabel, icon: Icon, label, note, onAction, tone, value }: MetricCardProps) {
  return (
    <Card className="home-metric-card">
      <span className={cn("metric-icon-badge", `metric-icon-badge-${tone}`)}>
        <Icon aria-hidden="true" size={22} strokeWidth={2.4} />
      </span>
      <div>
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <p>{note}</p>
        {actionLabel && onAction && (
          <button className="metric-action" onClick={onAction} type="button">
            {actionLabel}
          </button>
        )}
      </div>
    </Card>
  );
}
