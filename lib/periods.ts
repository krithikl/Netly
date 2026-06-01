import type { PeriodOption, Transaction, TransactionDateRange } from "./types";

// Filters transactions for dashboard period tabs using today's local calendar window.
export function filterTransactionsByPeriod(transactions: Transaction[], period: PeriodOption, referenceDate = new Date()) {
  if (period === "All") {
    return transactions;
  }

  const normalizedReferenceDate = normalizeDate(referenceDate);
  const startDate = getPeriodStartDate(period, normalizedReferenceDate);

  return transactions.filter((txn) => {
    const txnDate = parseTransactionDate(txn);
    return txnDate >= startDate && txnDate <= normalizedReferenceDate;
  });
}

export function filterTransactionsByDateRange(transactions: Transaction[], dateRange: TransactionDateRange) {
  return transactions.filter((txn) => {
    return isTransactionInDateRange(txn, dateRange.from, dateRange.to);
  });
}

export function isTransactionInDateRange(transaction: Transaction, fromDate?: string, toDate?: string) {
  const txnDate = getTransactionDate(transaction);
  return (!fromDate || txnDate >= fromDate) && (!toDate || txnDate <= toDate);
}

export function getThisMonthDateRange(referenceDate = new Date()): TransactionDateRange {
  const from = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

  return {
    from: formatDateInputValue(from),
    to: formatDateInputValue(referenceDate)
  };
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Converts a dashboard period option into its inclusive local start date.
function getPeriodStartDate(period: Exclude<PeriodOption, "All">, referenceDate: Date) {
  if (period === "This month") {
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 12);
  }

  const days = period === "30 days" ? 30 : 90;
  const startDate = new Date(referenceDate);
  startDate.setDate(referenceDate.getDate() - days);
  return normalizeDate(startDate);
}

// Parses a transaction's date-only value at local noon to avoid midnight edge cases.
function parseTransactionDate(transaction: Transaction) {
  const transactionDate = new Date(`${getTransactionDate(transaction)}T12:00:00`);

  if (Number.isNaN(transactionDate.getTime())) {
    throw new Error(`Invalid transaction date "${getTransactionDate(transaction)}".`);
  }

  return transactionDate;
}

// Extracts the YYYY-MM-DD transaction date used for period comparisons.
function getTransactionDate(transaction: Transaction) {
  if (typeof transaction.date !== "string") {
    throw new Error("Transaction period invariant failed: transaction date must be a string.");
  }

  return transaction.date.slice(0, 10);
}

// Normalizes dates to local noon so calendar comparisons do not drift at midnight.
function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}
