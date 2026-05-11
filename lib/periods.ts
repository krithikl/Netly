import type { PeriodOption, Transaction, TransactionDateRange } from "./types";
import { getTransactionDate, getTransactionStatus } from "@/lib/transaction-display";

const fallbackReferenceDate = new Date("2026-05-04T12:00:00+12:00");

export function filterTransactionsByPeriod(transactions: Transaction[], period: PeriodOption) {
  if (period === "All") {
    return transactions;
  }

  const referenceDate = getReferenceDate(transactions);

  return transactions.filter((txn) => {
    if (getTransactionStatus(txn) === "Upcoming") {
      return true;
    }

    const txnDate = new Date(`${getTransactionDate(txn)}T12:00:00+12:00`);

    if (period === "This month") {
      return txnDate.getFullYear() === referenceDate.getFullYear() && txnDate.getMonth() === referenceDate.getMonth();
    }

    const days = period === "30 days" ? 30 : 90;
    const start = new Date(referenceDate);
    start.setDate(referenceDate.getDate() - days);

    return txnDate >= start && txnDate <= referenceDate;
  });
}

export function filterTransactionsByDateRange(transactions: Transaction[], dateRange: TransactionDateRange) {
  return transactions.filter((txn) => {
    if (getTransactionStatus(txn) === "Upcoming") {
      return true;
    }

    const txnDate = getTransactionDate(txn);
    return (!dateRange.from || txnDate >= dateRange.from) && (!dateRange.to || txnDate <= dateRange.to);
  });
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

function getReferenceDate(transactions: Transaction[]) {
  const latestTimestamp = transactions
    .filter((txn) => getTransactionStatus(txn) !== "Upcoming")
    .map((txn) => new Date(`${getTransactionDate(txn)}T12:00:00+12:00`).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return latestTimestamp ? new Date(latestTimestamp) : fallbackReferenceDate;
}
