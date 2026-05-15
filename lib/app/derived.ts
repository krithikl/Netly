import type { DataMode, LinkedAccount, TransactionAccountOption, TransactionFilter, TransactionSort } from "@/lib/app/types";
import {
  getTransactionAccountLabel,
  getTransactionCategory,
  getTransactionDate,
  getTransactionMerchant,
  getTransactionSearchText,
  getTransactionStatus
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

// Filters and sorts transactions for the Transactions page
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

// Checks whether one transaction matches the active filters and search text.
// Applies the top-level All/Expenses/Income filter.
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
  switch (transactionSort) {
    case "Oldest":
      return getTransactionDate(first).localeCompare(getTransactionDate(second));
    case "Amount high":
      return Math.abs(second.amount) - Math.abs(first.amount);
    case "Amount low":
      return Math.abs(first.amount) - Math.abs(second.amount);
    default:
      return getTransactionDate(second).localeCompare(getTransactionDate(first));
  }
}

export function getConnectionTitle(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "Checking Akahu";
  }

  if (dataMode === "demo") {
    return "Demo data";
  }

  return isConnected ? "Akahu connected" : "Akahu ready";
}

export function getConnectionCopy(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "Loading available transaction data.";
  }

  if (dataMode === "demo") {
    return "Using Akahu-shaped sample transactions.";
  }

  return isConnected ? "Transactions are loading from Akahu." : "No connected Akahu data loaded.";
}

export function getDataSourceLabel(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "checking connection";
  }

  if (dataMode === "demo") {
    return "Akahu-shaped demo data";
  }

  return isConnected ? "Akahu" : "no connected Akahu data";
}

// Shows the linked account name, or a simple count when there are multiple accounts
export function getLinkedAccountLabel(primaryLinkedAccount: LinkedAccount | null, linkedAccountCount: number, isConnected: boolean) {
  if (primaryLinkedAccount) {
    const ownerPrefix = primaryLinkedAccount.ownerName ? `${primaryLinkedAccount.ownerName} · ` : "";
    return `${ownerPrefix}${primaryLinkedAccount.displayName} ${primaryLinkedAccount.identification}`;
  }

  if (!isConnected) {
    return "";
  }

  return `${linkedAccountCount} linked account${linkedAccountCount === 1 ? "" : "s"}`;
}

export function getLinkedUserName(primaryLinkedAccount: LinkedAccount | null, dataMode: DataMode) {
  if (primaryLinkedAccount?.ownerName) {
    return primaryLinkedAccount.ownerName;
  }

  return dataMode === "demo" ? "Demo user" : "";
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

export function getStatusBannerTitle(transactionLoadError: string, dataMode: DataMode) {
  if (transactionLoadError) {
    return dataMode === "demo" ? "Demo data unavailable." : "Akahu data unavailable.";
  }

  return dataMode === "demo" ? "Demo data." : "Akahu connected.";
}

export function getCardFitSourceLabel(dataMode: DataMode, isConnected: boolean) {
  if (dataMode === "demo") {
    return "Akahu-shaped demo transactions";
  }

  return isConnected ? "connected Akahu transactions" : "Akahu transactions";
}

export function getCardFitWindowLabel(cardBasis: { latestTransactionDate: string | null; windowDays: number }) {
  if (!cardBasis.latestTransactionDate) {
    return `Last ${cardBasis.windowDays} days`;
  }

  return `Last ${cardBasis.windowDays} days ending ${cardBasis.latestTransactionDate}`;
}
