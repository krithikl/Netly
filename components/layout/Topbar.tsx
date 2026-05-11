import { TimeRangeTabs } from "@/components/layout/TimeRangeTabs";
import type { PeriodOption } from "@/lib/types";

type TopbarProps = {
  dataSourceLabel: string;
  linkedAccountLabel: string;
  linkedUserName: string;
  payday: string;
  period: PeriodOption;
  setPeriod: (period: PeriodOption) => void;
  showPeriodControl: boolean;
};

export function Topbar({
  dataSourceLabel,
  linkedAccountLabel,
  linkedUserName,
  payday,
  period,
  setPeriod,
  showPeriodControl
}: TopbarProps) {
  const dateLabel = formatDateLabel(payday);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{dateLabel}</p>
        <h1>Good evening{linkedUserName ? `, ${linkedUserName}` : ""} 👋</h1>
        <p className="topbar-subtitle">Here is your money picture.</p>
        <p className="header-note">
          Data source: {dataSourceLabel}
          {linkedAccountLabel ? ` · Linked account: ${linkedAccountLabel}` : ""}
        </p>
      </div>
      {showPeriodControl && (
        <div className="topbar-controls">
          <TimeRangeTabs period={period} setPeriod={setPeriod} />
        </div>
      )}
    </header>
  );
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date).toUpperCase();
}
