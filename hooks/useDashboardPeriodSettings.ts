"use client";

import { useCallback, useState } from "react";
import { dashboardPeriodStorageKey, periods } from "@/lib/app/constants";
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

  try {
    const parsedValue = JSON.parse(value) as PeriodOption;
    return periods.includes(parsedValue) ? parsedValue : defaultPeriod;
  } catch {
    return periods.includes(value as PeriodOption) ? value as PeriodOption : defaultPeriod;
  }
}
