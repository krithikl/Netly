import type { Transaction, TransactionDateRange } from "@/lib/types";

export const incrementalTransactionOverlapDays = 7;

// Builds the foreground Akahu sync range without reloading the whole archive.
export function getIncrementalTransactionSyncRange(
  archivedTransactions: Transaction[],
  visibleDateRange: TransactionDateRange | undefined,
  today: Date = new Date()
): TransactionDateRange | undefined {
  const newestArchivedDate = getNewestTransactionDate(archivedTransactions);

  if (!newestArchivedDate) {
    return visibleDateRange;
  }

  return {
    from: formatDateInputValue(subtractDays(newestArchivedDate, incrementalTransactionOverlapDays)),
    to: formatDateInputValue(today)
  };
}

// Finds the newest local transaction date and fails loudly on malformed dates.
export function getNewestTransactionDate(transactions: Transaction[]) {
  let newestDate: Date | null = null;

  for (const transaction of transactions) {
    const date = parseTransactionDate(getTransactionDateValue(transaction));

    if (!newestDate || date.getTime() > newestDate.getTime()) {
      newestDate = date;
    }
  }

  return newestDate;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTransactionDateValue(transaction: Transaction) {
  if (typeof transaction.date !== "string") {
    throw new Error("Invalid archived transaction: missing date.");
  }

  return transaction.date;
}

function subtractDays(date: Date, days: number) {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
}

function parseTransactionDate(value: string) {
  const normalizedValue = value.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new Error(`Invalid archived transaction date "${value}". Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = normalizedValue.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid archived transaction date "${value}".`);
  }

  return date;
}
