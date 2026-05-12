"use client";

import { useCallback, useMemo, useState } from "react";

const paydayStorageKey = "netly_payday";

type PaydayRule = {
  day: number;
  type: "day";
} | {
  type: "last";
};

// Stores payday settings and calculates the next displayed payday date.
export function usePaydaySettings(defaultPayday: string) {
  const [paydayRule, setPaydayRule] = useState<PaydayRule>(() => getPaydayRuleFromDate(defaultPayday, defaultPayday));
  const payday = useMemo(() => getNextPaydayDate(paydayRule), [paydayRule]);
  const paydayPatternDate = useMemo(() => getNextPaydayPatternDate(paydayRule), [paydayRule]);

  const restorePaydaySettings = useCallback(() => {
    setPaydayRule(readSavedPaydayRule(defaultPayday));
  }, [defaultPayday]);

  const updatePayday = useCallback((nextPayday: string) => {
    const nextRule = getPaydayRuleFromDate(nextPayday, defaultPayday);

    setPaydayRule(nextRule);
    window.localStorage.setItem(paydayStorageKey, JSON.stringify(nextRule));
  }, [defaultPayday]);

  return {
    payday,
    paydayPatternDate,
    restorePaydaySettings,
    updatePayday
  };
}

function readSavedPaydayRule(defaultPayday: string): PaydayRule {
  const savedValue = window.localStorage.getItem(paydayStorageKey);

  if (!savedValue) {
    return getPaydayRuleFromDate(defaultPayday, defaultPayday);
  }

  try {
    const parsedValue = JSON.parse(savedValue) as Partial<PaydayRule>;

    if (parsedValue.type === "last") {
      return { type: "last" };
    }

    if (parsedValue.type === "day" && typeof parsedValue.day === "number") {
      return { type: "day", day: clampPaydayDay(parsedValue.day) };
    }
  } catch {
    return getPaydayRuleFromDate(savedValue, defaultPayday);
  }

  return getPaydayRuleFromDate(defaultPayday, defaultPayday);
}

function getPaydayRuleFromDate(value: string, defaultPayday: string): PaydayRule {
  const date = parseLocalDate(value);

  if (!date) {
    const fallbackDate = parseLocalDate(defaultPayday);
    return fallbackDate ? getPaydayRuleFromDate(defaultPayday, "") : { type: "day", day: 15 };
  }

  if (date.getDate() === getDaysInMonth(date.getFullYear(), date.getMonth())) {
    return { type: "last" };
  }

  return {
    type: "day",
    day: clampPaydayDay(date.getDate())
  };
}

// Calculates the next payday date from the saved rule.
function getNextPaydayDate(rule: PaydayRule) {
  const today = new Date();
  const todayMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const thisMonthPayday = getAdjustedPaydayForMonth(rule, today.getFullYear(), today.getMonth());
  const nextPayday = thisMonthPayday >= todayMidday
    ? thisMonthPayday
    : getAdjustedPaydayForMonth(rule, today.getFullYear(), today.getMonth() + 1);

  return formatLocalDate(nextPayday);
}

function getNextPaydayPatternDate(rule: PaydayRule) {
  const today = new Date();
  const todayMidday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const thisMonthPayday = getAdjustedPaydayForMonth(rule, today.getFullYear(), today.getMonth());
  const patternDate = thisMonthPayday >= todayMidday
    ? getUnadjustedPaydayForMonth(rule, today.getFullYear(), today.getMonth())
    : getUnadjustedPaydayForMonth(rule, today.getFullYear(), today.getMonth() + 1);

  return formatLocalDate(patternDate);
}

function getAdjustedPaydayForMonth(rule: PaydayRule, year: number, monthIndex: number) {
  return adjustWeekendToPreviousWeekday(getUnadjustedPaydayForMonth(rule, year, monthIndex));
}

function getUnadjustedPaydayForMonth(rule: PaydayRule, year: number, monthIndex: number) {
  const normalizedMonthDate = new Date(year, monthIndex, 1, 12);
  const normalizedYear = normalizedMonthDate.getFullYear();
  const normalizedMonth = normalizedMonthDate.getMonth();
  const monthDays = getDaysInMonth(normalizedYear, normalizedMonth);
  const paydayDay = rule.type === "last" ? monthDays : Math.min(rule.day, monthDays);

  return new Date(normalizedYear, normalizedMonth, paydayDay, 12);
}

function adjustWeekendToPreviousWeekday(date: Date) {
  const day = date.getDay();

  if (day === 6) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 12);
  }

  if (day === 0) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 2, 12);
  }

  return date;
}

function parseLocalDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampPaydayDay(day: number) {
  return Math.min(31, Math.max(1, Math.round(day)));
}
