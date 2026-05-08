import clsx from "clsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { periods } from "@/lib/app/constants";
import type { DataMode } from "@/lib/app/types";
import type { PeriodOption } from "@/lib/types";

type TopbarProps = {
  changeDataMode: (mode: DataMode) => void;
  dataMode: DataMode;
  dataSourceLabel: string;
  linkedAccountLabel: string;
  linkedUserName: string;
  payday: string;
  period: PeriodOption;
  setPeriod: (period: PeriodOption) => void;
  showPeriodControl: boolean;
};

export function Topbar({
  changeDataMode,
  dataMode,
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
          <DataModeSwitch changeDataMode={changeDataMode} dataMode={dataMode} />
          <PeriodControl period={period} setPeriod={setPeriod} />
        </div>
      )}
    </header>
  );
}

function DataModeSwitch({ changeDataMode, dataMode }: { changeDataMode: (mode: DataMode) => void; dataMode: DataMode }) {
  return (
    <div className="source-switch" aria-label="Selected data source">
      {(["user", "demo"] as const).map((mode) => (
        <button className={getDataModeClassName(dataMode, mode)} key={mode} onClick={() => changeDataMode(mode)} type="button">
          {getDataModeLabel(mode)}
        </button>
      ))}
    </div>
  );
}

function PeriodControl({ period, setPeriod }: { period: PeriodOption; setPeriod: (period: PeriodOption) => void }) {
  const handlePeriodChange = (value: string) => setPeriod(value as PeriodOption);

  return (
    <Tabs onValueChange={handlePeriodChange} value={period}>
      <TabsList aria-label="Selected period" className="bg-white/75">
        {periods.map((option) => (
          <TabsTrigger key={option} value={option}>
            {option}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function getDataModeClassName(currentMode: DataMode, mode: DataMode) {
  return clsx(currentMode === mode && "active");
}

function getDataModeLabel(mode: DataMode) {
  return mode === "user" ? "User" : "Demo";
}
