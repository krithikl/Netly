import { ArrowRight, CalendarDays, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/insights";

type HeroBalanceCardProps = {
  availableBalance: number | null;
  isConnected: boolean;
  onConnect: () => void;
  onReviewSpend: () => void;
  payday: string;
  paydayPatternDate: string;
  setPayday: (payday: string) => void;
};

// Home hero card for available balance, safe-to-spend, and payday controls.
export function HeroBalanceCard({
  availableBalance,
  isConnected,
  onConnect,
  onReviewSpend,
  payday,
  paydayPatternDate,
  setPayday
}: HeroBalanceCardProps) {
  const [paydayPopoverOpen, setPaydayPopoverOpen] = useState(false);
  const balanceLabel = availableBalance === null ? "Loading" : formatMoney(availableBalance, true);
  const paydayLabel = formatPayday(payday);
  const daysToPayday = getDaysUntil(payday);
  const nextPaydayDate = parsePaydayDate(payday);
  const paydayPattern = parsePaydayDate(paydayPatternDate);
  const selectPayday = (nextPayday: Date | undefined) => {
    if (nextPayday) {
      setPayday(formatPaydayValue(nextPayday));
      setPaydayPopoverOpen(false);
    }
  };

  return (
    <Card className="hero-card" aria-label="Balance overview" role="region">
      <div className="hero-card-section hero-balance">
        <span className="eyebrow">Available balance</span>
        <strong>{balanceLabel}</strong>
      </div>

      <div className="hero-card-divider" aria-hidden="true" />

      <div className="hero-card-section hero-payday">
        <span className="payday-heading">
          <span className="eyebrow">Payday in</span>
          <Popover open={paydayPopoverOpen} onOpenChange={setPaydayPopoverOpen}>
            <PopoverTrigger asChild>
              <button className="payday-edit-button" type="button" aria-label="Edit payday">
                <Pencil aria-hidden="true" size={14} strokeWidth={2.4} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="payday-popover">
              <div className="payday-popover-heading">
                <CalendarDays aria-hidden="true" size={16} strokeWidth={2.4} />
                <div>
                  <strong>Payday pattern</strong>
                  <span>{getPaydayPatternLabel(paydayPattern)}</span>
                </div>
              </div>
              <Calendar
                defaultMonth={paydayPattern}
                fixedWeeks
                mode="single"
                navLayout="after"
                numberOfMonths={1}
                onSelect={selectPayday}
                required
                selected={nextPaydayDate}
              />
            </PopoverContent>
          </Popover>
        </span>
        <strong>{daysToPayday}</strong>
        <span className="payday-unit">days</span>
        <p>{paydayLabel}</p>
      </div>

      <div className="hero-actions items-end">
        {!isConnected ? (
          <>
            <Button className="hero-secondary-action" onClick={onConnect} type="button" variant="outline">
              Connect bank
            </Button>

            <Button onClick={onReviewSpend} type="button">
              Review spend
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2.4} />
            </Button>
          </>
        ) : (
          <div className="ml-auto">
            <Button onClick={onReviewSpend} type="button">
              Review spend
              <ArrowRight aria-hidden="true" size={16} strokeWidth={2.4} />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function formatPayday(value: string) {
  const date = parsePaydayDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getDaysUntil(value: string) {
  const targetDate = parsePaydayDate(value);

  if (!targetDate) {
    return 0;
  }

  const today = new Date();
  const todayMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  return Math.max(0, Math.ceil((targetDate.getTime() - todayMidday.getTime()) / millisecondsInDay));
}

function parsePaydayDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatPaydayValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPaydayPatternLabel(date: Date | undefined) {
  if (!date) {
    return "Choose your regular payday.";
  }

  if (date.getDate() === getDaysInMonth(date)) {
    return "Last weekday of each month.";
  }

  return `Monthly on the ${getOrdinal(date.getDate())}, adjusted before weekends.`;
}

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getOrdinal(day: number) {
  const suffix = day % 10 === 1 && day !== 11
    ? "st"
    : day % 10 === 2 && day !== 12
      ? "nd"
      : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";

  return `${day}${suffix}`;
}
