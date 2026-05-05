import type { PeriodOption, Transaction } from "./types";

const referenceDate = new Date("2026-05-04T12:00:00+12:00");

export function filterTransactionsByPeriod(transactions: Transaction[], period: PeriodOption) {
  if (period === "All") {
    return transactions;
  }

  return transactions.filter((txn) => {
    if (txn.status === "Upcoming") {
      return true;
    }

    const txnDate = new Date(`${txn.date}T12:00:00+12:00`);

    if (period === "This month") {
      return txnDate.getFullYear() === referenceDate.getFullYear() && txnDate.getMonth() === referenceDate.getMonth();
    }

    const days = period === "30 days" ? 30 : 90;
    const start = new Date(referenceDate);
    start.setDate(referenceDate.getDate() - days);

    return txnDate >= start && txnDate <= referenceDate;
  });
}
