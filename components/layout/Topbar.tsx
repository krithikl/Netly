import { TimeRangeTabs } from "@/components/layout/TimeRangeTabs";
import type { View } from "@/lib/app/types";
import type { PeriodOption } from "@/lib/types";

type TopbarProps = {
  activeView: View;
  dataSourceLabel: string;
  linkedAccountLabel: string;
  linkedUserName: string;
  payday: string;
  period: PeriodOption;
  setPeriod: (period: PeriodOption) => void;
  showPeriodControl: boolean;
};

export function Topbar({
  activeView,
  dataSourceLabel,
  linkedAccountLabel,
  linkedUserName,
  payday,
  period,
  setPeriod,
  showPeriodControl
}: TopbarProps) {
  const dateLabel = formatDateLabel(payday);
  const pageCopy = getPageCopy(activeView, linkedUserName);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{dateLabel}</p>
        <h1>{pageCopy.title}</h1>
        <p className="topbar-subtitle">{pageCopy.subtitle}</p>
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

function getPageCopy(activeView: View, linkedUserName: string) {
  if (activeView === "transactions") {
    return {
      title: "Transactions",
      subtitle: "All your transactions in one place."
    };
  }

  return {
    title: `Good evening${linkedUserName ? `, ${linkedUserName}` : ""}`,
    subtitle: "Here is your money picture."
  };
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
