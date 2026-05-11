import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { periods } from "@/lib/app/constants";
import type { PeriodOption } from "@/lib/types";

type TimeRangeTabsProps = {
  period: PeriodOption;
  setPeriod: (period: PeriodOption) => void;
};

export function TimeRangeTabs({ period, setPeriod }: TimeRangeTabsProps) {
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
