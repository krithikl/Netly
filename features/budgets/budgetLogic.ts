import type { Transaction } from "../../lib/types";

export type BudgetCadence = "weekly" | "fortnightly" | "monthly";

export type BudgetCategoryBreakdown = {
  amount: number;
  category: string;
  percentOfSpending: number;
  transactions: Transaction[];
  transactionCount: number;
};

export type BudgetPeriod = {
  endDate: Date;
  filterEndDate: Date;
  startDate: Date;
};

const dayMs = 24 * 60 * 60 * 1000;
const needsReviewCategory = "Needs review";
const whitespacePattern = /\s+/g;

// Builds the selected budget category breakdown from current-month debit transactions.
export function getBudgetCategoryBreakdown(transactions: Transaction[], categoryNames: string[]): BudgetCategoryBreakdown[] {
  const selectedCategories = new Set(categoryNames);
  const categoryRows = new Map<string, { amount: number; transactions: Transaction[] }>();

  categoryNames.forEach((category) => {
    categoryRows.set(category, { amount: 0, transactions: [] });
  });

  transactions.forEach((transaction) => {
    if (transaction.amount >= 0) {
      return;
    }

    const category = getBudgetTransactionCategory(transaction);

    if (!selectedCategories.has(category)) {
      return;
    }

    const row = categoryRows.get(category);

    if (!row) {
      throw new Error(`Budget category breakdown invariant failed: missing selected category "${category}".`);
    }

    row.amount += Math.abs(transaction.amount);
    row.transactions.push(transaction);
  });

  const totalSpend = getBudgetSpendFromBreakdownValues([...categoryRows.values()]);

  return [...categoryRows.entries()]
    .filter(([, row]) => row.amount > 0)
    .map(([category, row]) => ({
      amount: row.amount,
      category,
      percentOfSpending: totalSpend > 0 ? row.amount / totalSpend : 0,
      transactions: [...row.transactions].sort(compareBudgetTransactions),
      transactionCount: row.transactions.length
    }))
    .sort(compareBudgetCategoryBreakdowns);
}

// Sums the amount values already calculated for a budget category breakdown.
export function getBudgetSpendFromBreakdown(breakdown: BudgetCategoryBreakdown[]) {
  return getBudgetSpendFromBreakdownValues(breakdown);
}

// Keeps chart data focused on categories that have spending in the period.
export function getBudgetChartCategories(breakdown: BudgetCategoryBreakdown[]) {
  return breakdown
    .filter((item) => item.amount > 0)
    .map((item) => ({
      amount: item.amount,
      category: item.category
    }));
}

// Returns the active reset window for a budget cadence.
export function getBudgetPeriod(cadence: BudgetCadence, periodAnchorDate: string, referenceDate = new Date()): BudgetPeriod {
  const normalizedReferenceDate = normalizeDate(referenceDate);

  if (cadence === "monthly") {
    const startDate = new Date(normalizedReferenceDate.getFullYear(), normalizedReferenceDate.getMonth(), 1);
    const endDate = new Date(normalizedReferenceDate.getFullYear(), normalizedReferenceDate.getMonth() + 1, 0);

    return {
      endDate,
      filterEndDate: minDate(normalizedReferenceDate, endDate),
      startDate
    };
  }

  const periodDays = cadence === "weekly" ? 7 : 14;
  const anchorDate = parseBudgetAnchorDate(periodAnchorDate);
  const elapsedDays = Math.floor((normalizedReferenceDate.getTime() - anchorDate.getTime()) / dayMs);
  const periodIndex = Math.floor(elapsedDays / periodDays);
  const startDate = addDays(anchorDate, periodIndex * periodDays);
  const endDate = addDays(startDate, periodDays - 1);

  return {
    endDate,
    filterEndDate: minDate(normalizedReferenceDate, endDate),
    startDate
  };
}

// Filters transactions to the active budget reset window.
export function getBudgetPeriodTransactions(transactions: Transaction[], cadence: BudgetCadence, periodAnchorDate: string, referenceDate = new Date()) {
  const period = getBudgetPeriod(cadence, periodAnchorDate, referenceDate);
  const fromDate = formatDateInputValue(period.startDate);
  const toDate = formatDateInputValue(period.filterEndDate);

  return transactions.filter((transaction) => {
    const transactionDate = getBudgetTransactionDate(transaction);
    return transactionDate >= fromDate && transactionDate <= toDate;
  });
}

// Calculates where today sits in the active budget period.
export function getBudgetPeriodProgress(period: BudgetPeriod, referenceDate = new Date()) {
  const normalizedReferenceDate = normalizeDate(referenceDate);
  const periodLength = Math.max(1, getDateDifferenceDays(period.startDate, period.endDate));
  const elapsedDays = getDateDifferenceDays(period.startDate, minDate(normalizedReferenceDate, period.endDate));

  return Math.min(100, Math.max(0, (elapsedDays / periodLength) * 100));
}

// Counts remaining days in the active budget period, keeping today actionable.
export function getBudgetDaysLeft(period: BudgetPeriod, referenceDate = new Date()) {
  return Math.max(1, getDateDifferenceDays(normalizeDate(referenceDate), period.endDate));
}

function compareBudgetCategoryBreakdowns(first: BudgetCategoryBreakdown, second: BudgetCategoryBreakdown) {
  if (second.amount !== first.amount) {
    return second.amount - first.amount;
  }

  return first.category.localeCompare(second.category);
}

function getBudgetSpendFromBreakdownValues(values: Array<{ amount: number }>) {
  return values.reduce((total, item) => total + item.amount, 0);
}

// Reads the effective transaction category from already preference-applied transaction data.
function getBudgetTransactionCategory(transaction: Transaction) {
  return normalizeDisplayText(
    transaction.netly?.categoryOverride
    || transaction.netly?.categoryRule
    || transaction.category?.groups?.personal_finance?.name
    || transaction.category?.name
  ) || needsReviewCategory;
}

function getBudgetTransactionId(transaction: Transaction) {
  if (transaction._id) {
    return transaction._id;
  }

  return [
    "transaction",
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2)
  ].join(":");
}

function getBudgetTransactionDate(transaction: Transaction) {
  if (typeof transaction.date !== "string") {
    throw new Error("Budget breakdown transaction invariant failed: transaction date must be a string.");
  }

  return transaction.date.slice(0, 10);
}

function parseBudgetAnchorDate(value: string) {
  const timestamp = Date.parse(`${value}T12:00:00`);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid budget period anchor date "${value}". Expected YYYY-MM-DD.`);
  }

  return normalizeDate(new Date(timestamp));
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return normalizeDate(nextDate);
}

function getDateDifferenceDays(first: Date, second: Date) {
  return Math.floor((normalizeDate(second).getTime() - normalizeDate(first).getTime()) / dayMs);
}

function minDate(first: Date, second: Date) {
  return first.getTime() <= second.getTime() ? normalizeDate(first) : normalizeDate(second);
}

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function compareBudgetTransactions(first: Transaction, second: Transaction) {
  const dateDifference = getBudgetTransactionDate(second).localeCompare(getBudgetTransactionDate(first));

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return getBudgetTransactionId(first).localeCompare(getBudgetTransactionId(second));
}

function normalizeDisplayText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(whitespacePattern, " ") : "";
}
