import { CalendarDays, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/insights";

type HeroBalanceCardProps = {
  availableBalance: number | null;
  hideBalances: boolean;
  insights: string[];
  isConnected: boolean;
  payday: string;
  paydayPatternDate: string;
  setHideBalances: (hidden: boolean) => void;
  setPayday: (payday: string) => void;
};

// Home hero card for available balance and payday controls.
export function HeroBalanceCard({
  availableBalance,
  hideBalances,
  insights,
  payday,
  paydayPatternDate,
  setHideBalances,
  setPayday
}: HeroBalanceCardProps) {
  const [paydayPopoverOpen, setPaydayPopoverOpen] = useState(false);
  const balanceLabel = hideBalances ? "••••" : availableBalance === null ? "Loading" : formatMoney(availableBalance, true);
  const BalanceVisibilityIcon = hideBalances ? EyeOff : Eye;
  const paydayLabel = formatPayday(payday);
  const daysToPayday = getDaysUntil(payday);
  const nextPaydayDate = parsePaydayDate(payday);
  const paydayPattern = parsePaydayDate(paydayPatternDate);
  const heroInsight = insights.find((insight) => insight.trim().length > 0);
  const selectPayday = (nextPayday: Date | undefined) => {
    if (nextPayday) {
      setPayday(formatPaydayValue(nextPayday));
      setPaydayPopoverOpen(false);
    }
  };

  return (
    <Card className={`hero-card${heroInsight ? " has-hero-insight" : ""}`} aria-label="Balance overview" role="region">
      <div className="hero-card-section hero-balance">
        <span className="balance-heading">
          <span className="eyebrow">Available balance</span>
          <Button
            aria-label={hideBalances ? "Show balance" : "Hide balance"}
            className="balance-visibility-button"
            onClick={() => setHideBalances(!hideBalances)}
            size="icon"
            title={hideBalances ? "Show balance" : "Hide balance"}
            type="button"
            variant="ghost"
          >
            <BalanceVisibilityIcon aria-hidden="true" className="h-4 w-4" />
          </Button>
        </span>
        <strong>{balanceLabel}</strong>
        <Popover open={paydayPopoverOpen} onOpenChange={setPaydayPopoverOpen}>
          <PopoverTrigger asChild>
            <button className="hero-payday-pill" type="button" aria-label="Edit payday">
              <span className="hero-payday-icon" aria-hidden="true">
                <CalendarDays size={18} strokeWidth={2.4} />
              </span>
              <span>
                <b>Payday in {daysToPayday} days</b>
                <small>{paydayLabel}</small>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="payday-popover">
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
      </div>
      {heroInsight ? (
        <div className="hero-insight-preview" aria-label="Spend insight">
          <span>Insight</span>
          <p>{heroInsight}</p>
        </div>
      ) : null}
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
