"use client";

import { useCallback, useMemo, useState } from "react";
import { getVisibleTransactions } from "@/lib/app/derived";
import type { DataMode, TransactionFilter, TransactionSort } from "@/lib/app/types";
import { filterTransactionsByDateRange, getThisMonthDateRange } from "@/lib/periods";
import type { Transaction, TransactionDateRange } from "@/lib/types";

type UseTransactionControlsOptions = {
  applyFallbackState: (mode: DataMode, error: unknown, fallbackMessage: string) => void;
  dataMode: DataMode;
  refreshTransactionPage: (mode?: DataMode, dateRange?: TransactionDateRange) => Promise<void>;
  transactions: Transaction[];
};

// Owns Transactions page controls: query, filters, sort, date range, and visible rows.
export function useTransactionControls({
  applyFallbackState,
  dataMode,
  refreshTransactionPage,
  transactions
}: UseTransactionControlsOptions) {
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("All");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("Newest");
  const [transactionCategory, setTransactionCategory] = useState<string[]>([]);
  const [transactionDateRange, setTransactionDateRangeState] = useState(getThisMonthDateRange);
  const transactionRangeTransactions = useMemo(
    () => filterTransactionsByDateRange(transactions, transactionDateRange),
    [transactionDateRange, transactions]
  );
  const visibleTransactions = useMemo(
    () => getVisibleTransactions(transactionRangeTransactions, query, transactionCategory, transactionFilter, transactionSort),
    [query, transactionCategory, transactionFilter, transactionRangeTransactions, transactionSort]
  );

  const setTransactionDateRange = useCallback((nextDateRange: TransactionDateRange) => {
    setTransactionDateRangeState(nextDateRange);
    setTransactionCategory([]);

    refreshTransactionPage(dataMode, nextDateRange).catch((error: unknown) => {
      applyFallbackState(dataMode, error, "Could not load transactions.");
    });
  }, [applyFallbackState, dataMode, refreshTransactionPage]);

  const resetTransactionControls = useCallback(() => {
    const defaultDateRange = getThisMonthDateRange();
    const shouldRefreshDateRange = transactionDateRange.from !== defaultDateRange.from || transactionDateRange.to !== defaultDateRange.to;

    setQuery("");
    setTransactionFilter("All");
    setTransactionSort("Newest");
    setTransactionCategory([]);
    setTransactionDateRangeState(defaultDateRange);

    if (shouldRefreshDateRange) {
      refreshTransactionPage(dataMode, defaultDateRange).catch((error: unknown) => {
        applyFallbackState(dataMode, error, "Could not load transactions.");
      });
    }
  }, [applyFallbackState, dataMode, refreshTransactionPage, transactionDateRange]);

  return {
    query,
    resetTransactionControls,
    setQuery,
    setTransactionCategory,
    setTransactionDateRange,
    setTransactionFilter,
    setTransactionSort,
    transactionCategory,
    transactionDateRange,
    transactionFilter,
    transactionSort,
    visibleTransactions
  };
}
