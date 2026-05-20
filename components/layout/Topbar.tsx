import { TimeRangeTabs } from "@/components/layout/TimeRangeTabs";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
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

// Header area that shows the active page copy, account context, and period selector.
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
  const isBottomNavigation = useIsBottomNavigation();
  const dateLabel = formatDateLabel(payday);
  const pageCopy = getPageCopy(activeView, linkedUserName);

  if (isBottomNavigation) {
    return null;
  }

  return (
    <header className="topbar" data-active-view={activeView}>
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

  if (activeView === "budgets") {
    return {
      title: "Budgets",
      subtitle: "Track category budgets and recurring payments."
    };
  }

  if (activeView === "cards") {
    return {
      title: "Card fit",
      subtitle: "Compare cards against your eligible spend."
    };
  }

  if (activeView === "connect") {
    return {
      title: "Connect",
      subtitle: "Manage Akahu connection options."
    };
  }

  if (activeView === "settings") {
    return {
      title: "Settings",
      subtitle: "Manage your Netly preferences."
    };
  }

  return {
    title: "Netly",
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
