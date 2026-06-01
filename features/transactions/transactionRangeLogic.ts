import type { Transaction, TransactionDateRange } from "../../lib/types";

export type TransactionRangeState = {
  hasLoadedActiveDateRange: boolean;
  hasMoreTransactions: boolean;
  shouldShowListLoading: boolean;
  shouldShowMonthSummaryLoading: boolean;
  transactions: Transaction[];
};

// Chooses exact page data when available and otherwise falls back to local archived rows.
export function getTransactionRangeState({
  activeDateRange,
  hasMoreTransactions,
  isLoadingTransactionPageRange,
  isLoadingTransactions,
  loadedDateRange,
  pageTransactions,
  sourceTransactions
}: {
  activeDateRange: TransactionDateRange;
  hasMoreTransactions: boolean;
  isLoadingTransactionPageRange: boolean;
  isLoadingTransactions: boolean;
  loadedDateRange: TransactionDateRange | null;
  pageTransactions: Transaction[];
  sourceTransactions: Transaction[];
}): TransactionRangeState {
  const hasLoadedActiveDateRange = getDateRangesMatch(activeDateRange, loadedDateRange);
  const sourceRangeTransactions = filterTransactionsByDateRange(sourceTransactions, activeDateRange);
  const shouldUseExactPageTransactions = hasLoadedActiveDateRange && pageTransactions.length > 0;
  const activeTransactions = shouldUseExactPageTransactions ? pageTransactions : sourceRangeTransactions;
  const isRangeRefreshRunning = isLoadingTransactions || isLoadingTransactionPageRange;
  const isActiveRangeLoading = isRangeRefreshRunning && (!hasLoadedActiveDateRange || pageTransactions.length === 0);
  const shouldShowLoading = isActiveRangeLoading && activeTransactions.length === 0;

  return {
    hasLoadedActiveDateRange,
    hasMoreTransactions: shouldUseExactPageTransactions && hasMoreTransactions,
    shouldShowListLoading: shouldShowLoading,
    shouldShowMonthSummaryLoading: shouldShowLoading,
    transactions: activeTransactions
  };
}

// Checks whether the loaded transaction page exactly matches the selected range.
export function getDateRangesMatch(first: TransactionDateRange, second: TransactionDateRange | null) {
  return Boolean(second && first.from === second.from && first.to === second.to);
}

function filterTransactionsByDateRange(transactions: Transaction[], dateRange: TransactionDateRange) {
  return transactions.filter((transaction) => {
    const transactionDate = getTransactionDateValue(transaction);

    return (!dateRange.from || transactionDate >= dateRange.from) && (!dateRange.to || transactionDate <= dateRange.to);
  });
}

function getTransactionDateValue(transaction: Transaction) {
  if (typeof transaction.date !== "string") {
    throw new Error("Transaction range state invariant failed: transaction date must be a string.");
  }

  return transaction.date.slice(0, 10);
}
