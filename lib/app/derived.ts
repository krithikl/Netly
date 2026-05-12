import type { DataMode, LinkedAccount, TransactionFilter, TransactionSort } from "@/lib/app/types";
import {
  getTransactionAccountLabel,
  getTransactionCategory,
  getTransactionDate,
  getTransactionId,
  getTransactionMerchant,
  getTransactionRawText,
  getTransactionStatus
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

// Applies saved category edits without changing the original Akahu records
export function applyCategoryOverrides(transactions: Transaction[], categoryOverrides: Record<string, string>) {
  return transactions.map((transaction) => {
    const override = categoryOverrides[getTransactionId(transaction)];

    if (!override) {
      return transaction;
    }

    return {
      ...transaction,
      netly: {
        ...transaction.netly,
        categoryOverride: override
      }
    };
  });
}

// Filters and sorts transactions for the Transactions page
export function getVisibleTransactions(
  transactions: Transaction[],
  query: string,
  transactionCategories: string[],
  transactionFilter: TransactionFilter,
  transactionSort: TransactionSort
) {
  const normalizedQuery = query.trim().toLowerCase();

  return transactions
    .filter((transaction) => matchesTransactionFilters(transaction, normalizedQuery, transactionCategories, transactionFilter))
    .sort((first, second) => compareTransactions(first, second, transactionSort));
}

// Checks whether one transaction matches the active filters and search text
function matchesTransactionFilters(transaction: Transaction, normalizedQuery: string, transactionCategories: string[], transactionFilter: TransactionFilter) {
  const category = getTransactionCategory(transaction);
  const matchesCategory = transactionCategories.length === 0 || transactionCategories.includes(category);

  if (!matchesCategory || !matchesTransactionFilter(transaction, transactionFilter)) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = `${getTransactionMerchant(transaction)} ${category} ${getTransactionAccountLabel(transaction)} ${getTransactionRawText(transaction)}`.toLowerCase();
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
