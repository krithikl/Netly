import type { LinkedAccount, TransactionAccountOption, TransactionFilter, TransactionSort } from "@/lib/app/types";
import { categoriesMatch } from "@/lib/category-rules";
import {
  getTransactionAccountLabel,
  getTransactionCategory,
  getTransactionFallbackSortTimestamp,
  getTransactionId,
  getTransactionMerchant,
  getTransactionSearchText,
  getTransactionTimestamp,
  transactionNeedsReview
} from "@/lib/transaction-display";
import type { Transaction, TransactionDateRange } from "@/lib/types";

export type TransactionAnalytics = {
  activeCategoryCount: number;
  averagePerDay: number;
  needsReviewCount: number;
  totalSpending: number;
};

// Filters and sorts the transaction rows shown by the Transactions page.
export function getVisibleTransactions(
  transactions: Transaction[],
  query: string,
  transactionAccounts: string[],
  transactionCategories: string[],
  transactionFilter: TransactionFilter,
  transactionSort: TransactionSort
) {
  const normalizedQuery = query.trim().toLowerCase();

  return transactions
    .filter((transaction) => matchesTransactionFilters(transaction, normalizedQuery, transactionAccounts, transactionCategories, transactionFilter))
    .sort((first, second) => compareTransactions(first, second, transactionSort));
}

// Builds account filter options from linked accounts and archived transaction metadata.
export function getTransactionAccountOptions(linkedAccounts: LinkedAccount[], transactions: Transaction[]): TransactionAccountOption[] {
  const labelsById = new Map<string, string>();

  linkedAccounts.forEach((account) => {
    labelsById.set(account.accountId, `${account.displayName} ${account.identification}`.trim());
  });
  transactions.forEach((transaction) => {
    if (!transaction._account) {
      return;
    }

    labelsById.set(transaction._account, labelsById.get(transaction._account) || getTransactionAccountLabel(transaction));
  });

  return [...labelsById.entries()]
    .map(([value, label]) => ({ label, value }))
    .sort((first, second) => first.label.localeCompare(second.label));
}

// Derives transaction totals for the current Transactions page filter/date range.
export function getTransactionAnalytics(transactions: Transaction[], dateRange: TransactionDateRange): TransactionAnalytics {
  const activeCategories = new Set<string>();
  let needsReviewCount = 0;
  let totalSpending = 0;

  transactions.forEach((transaction) => {
    if (transactionNeedsReview(transaction)) {
      needsReviewCount += 1;
    }

    if (transaction.amount < 0) {
      totalSpending += Math.abs(transaction.amount);
      activeCategories.add(getTransactionCategory(transaction));
    }
  });

  const rangeDays = getDateRangeDayCount(dateRange);

  return {
    activeCategoryCount: activeCategories.size,
    averagePerDay: rangeDays > 0 ? totalSpending / rangeDays : 0,
    needsReviewCount,
    totalSpending
  };
}

// Counts active filters so mobile controls can show a compact badge.
export function getActiveFilterCount(transactionFilter: TransactionFilter, transactionAccounts: string[], transactionCategory: string[]) {
  let count = 0;

  if (transactionFilter !== "All") {
    count += 1;
  }

  count += transactionAccounts.length;
  count += transactionCategory.length;

  return count;
}

// Toggles one value in a multi-select filter.
export function toggleFilterSelection(selectedValues: string[], value: string) {
  if (selectedValues.includes(value)) {
    return selectedValues.filter((selectedValue) => selectedValue !== value);
  }

  return [...selectedValues, value];
}

// Normalises category input before duplicate checks and creation.
export function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

// Finds an existing category while ignoring case and spacing differences.
export function getMatchingCategory(categories: string[], category: string) {
  if (!category) {
    return "";
  }

  return categories.find((currentCategory) => categoriesMatch(currentCategory, category)) || "";
}

// Checks whether one transaction matches the active filters and search text.
function matchesTransactionFilters(transaction: Transaction, normalizedQuery: string, transactionAccounts: string[], transactionCategories: string[], transactionFilter: TransactionFilter) {
  const category = getTransactionCategory(transaction);
  const matchesAccount = transactionAccounts.length === 0 || transactionAccounts.includes(transaction._account || "");
  const matchesCategory = transactionCategories.length === 0 || transactionCategories.includes(category);

  if (!matchesAccount || !matchesCategory || !matchesTransactionFilter(transaction, transactionFilter)) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = `${getTransactionMerchant(transaction)} ${category} ${getTransactionAccountLabel(transaction)} ${getTransactionSearchText(transaction)}`.toLowerCase();
  return searchableText.includes(normalizedQuery);
}

function matchesTransactionFilter(transaction: Transaction, transactionFilter: TransactionFilter) {
  switch (transactionFilter) {
    case "Expenses":
      return transaction.amount < 0;
    case "Income":
      return transaction.amount > 0;
    default:
      return true;
  }
}

// Sorts transaction rows according to the active Transactions page sort option.
function compareTransactions(first: Transaction, second: Transaction, transactionSort: TransactionSort) {
  const newestFirst = compareTransactionTimeDescending(first, second);

  switch (transactionSort) {
    case "Oldest":
      return -newestFirst;
    case "Amount high":
      return compareByAmount(second, first) || newestFirst;
    case "Amount low":
      return compareByAmount(first, second) || newestFirst;
    default:
      return newestFirst;
  }
}

function compareTransactionTimeDescending(first: Transaction, second: Transaction) {
  const dateDifference = getTransactionTimestamp(second) - getTransactionTimestamp(first);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  const fallbackDifference = getTransactionFallbackSortTimestamp(second) - getTransactionFallbackSortTimestamp(first);

  if (fallbackDifference !== 0) {
    return fallbackDifference;
  }

  return getTransactionId(second).localeCompare(getTransactionId(first));
}

function compareByAmount(first: Transaction, second: Transaction) {
  return Math.abs(first.amount) - Math.abs(second.amount);
}

function getDateRangeDayCount(dateRange: TransactionDateRange) {
  const from = parseInputDate(dateRange.from);
  const to = parseInputDate(dateRange.to);

  if (!from || !to) {
    return 0;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
}

function parseInputDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}
