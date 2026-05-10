import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { periods } from "@/lib/app/constants";
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
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Payday {payday}</p>
        <h1>Good evening{linkedUserName ? `, ${linkedUserName}` : ""}, here is your money picture.</h1>
        <p className="header-note">
          Data source: {dataSourceLabel}
          {linkedAccountLabel ? ` · Linked account: ${linkedAccountLabel}` : ""}
        </p>
      </div>
      {showPeriodControl && (
        <div className="topbar-controls">
          <PeriodControl period={period} setPeriod={setPeriod} />
        </div>
      )}
    </header>
  );
}

function PeriodControl({ period, setPeriod }: { period: PeriodOption; setPeriod: (period: PeriodOption) => void }) {
  const handlePeriodChange = (value: string) => setPeriod(value as PeriodOption);

  return (
    <Tabs className="period-control" onValueChange={handlePeriodChange} value={period}>
      <TabsList aria-label="Selected period" className="period-tabs">
        {periods.map((option) => (
          <TabsTrigger className="period-tab" key={option} value={option}>
            {option}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
