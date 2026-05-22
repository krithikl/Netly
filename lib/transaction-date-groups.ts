import type { Transaction } from "./types";

export type TransactionDateGroup = {
  date: string;
  transactions: Transaction[];
};

const transactionDateHeadingFormatter = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "long",
  weekday: "long"
});
const transactionDateHeadingWithYearFormatter = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "long",
  weekday: "long",
  year: "numeric"
});

// Formats a transaction group heading and includes the year only when needed.
export function formatTransactionDateHeading(value: string, now = new Date()) {
  const date = parseTransactionDate(value);
  const formatter = date.getFullYear() === now.getFullYear()
    ? transactionDateHeadingFormatter
    : transactionDateHeadingWithYearFormatter;

  return formatter.format(date);
}

// Groups adjacent transactions by transaction date without changing their sort order.
export function groupTransactionsByDate(transactions: Transaction[]): TransactionDateGroup[] {
  const groups: TransactionDateGroup[] = [];

  transactions.forEach((transaction) => {
    const date = getTransactionDateValue(transaction);
    const lastGroup = groups.at(-1);

    if (lastGroup?.date === date) {
      lastGroup.transactions.push(transaction);
      return;
    }

    groups.push({
      date,
      transactions: [transaction]
    });
  });

  return groups;
}

function getTransactionDateValue(transaction: Transaction) {
  return transaction.date.slice(0, 10);
}

function parseTransactionDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid transaction date "${value}". Expected YYYY-MM-DD.`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new Error(`Invalid transaction date "${value}".`);
  }

  return date;
}
