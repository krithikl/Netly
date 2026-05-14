"use client";

import { useCallback, useState } from "react";
import { dashboardPeriodStorageKey, periods } from "@/lib/app/constants";
import { parseStoredJson } from "@/lib/app/storage";
import type { PeriodOption } from "@/lib/types";

export function useDashboardPeriodSettings(defaultPeriod: PeriodOption) {
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodOption>(defaultPeriod);

  const restoreDashboardPeriod = useCallback(() => {
    setDashboardPeriod(readSavedDashboardPeriod(defaultPeriod));
  }, [defaultPeriod]);

  const updateDashboardPeriod = useCallback((period: PeriodOption) => {
    setDashboardPeriod(period);
    window.localStorage.setItem(dashboardPeriodStorageKey, JSON.stringify(period));
  }, []);

  return {
    dashboardPeriod,
    restoreDashboardPeriod,
    updateDashboardPeriod
  };
}

function readSavedDashboardPeriod(defaultPeriod: PeriodOption) {
  const value = window.localStorage.getItem(dashboardPeriodStorageKey);

  if (!value) {
    return defaultPeriod;
  }

  const parsedValue = parseStoredJson<unknown>(dashboardPeriodStorageKey, value);

  if (periods.includes(parsedValue as PeriodOption)) {
    return parsedValue as PeriodOption;
  }

  throw new Error(`Invalid localStorage key "${dashboardPeriodStorageKey}": expected one of ${periods.join(", ")}.`);
}
