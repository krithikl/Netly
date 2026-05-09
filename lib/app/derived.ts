import type { DataMode, LinkedAccount, PaymentTestResult, TransactionFilter, TransactionSort } from "@/lib/app/types";
import {
  getTransactionAccountLabel,
  getTransactionCategory,
  getTransactionDate,
  getTransactionId,
  getTransactionMerchant,
  getTransactionRawText,
  getTransactionStatus,
  isUpcomingTransaction
} from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

export function applyCategoryOverrides(transactions: Transaction[], categoryOverrides: Record<string, string>) {
  return transactions.map((transaction) => {
    const override = categoryOverrides[getTransactionId(transaction)];

    if (!override) {
      return transaction;
    }

    return {
      ...transaction,
      moneyfit: {
        ...transaction.moneyfit,
        categoryOverride: override
      }
    };
  });
}

export function getVisibleTransactions(
  transactions: Transaction[],
  query: string,
  transactionCategories: string[],
  transactionFilter: TransactionFilter,
  transactionSort: TransactionSort
) {
  return transactions
    .filter((transaction) => matchesTransactionFilters(transaction, query, transactionCategories, transactionFilter))
    .sort((first, second) => compareTransactions(first, second, transactionSort));
}

function matchesTransactionFilters(transaction: Transaction, query: string, transactionCategories: string[], transactionFilter: TransactionFilter) {
  const category = getTransactionCategory(transaction);
  const searchableText = `${getTransactionMerchant(transaction)} ${category} ${getTransactionAccountLabel(transaction)} ${getTransactionRawText(transaction)}`.toLowerCase();
  const matchesQuery = searchableText.includes(query.trim().toLowerCase());
  const matchesCategory = transactionCategories.length === 0 || transactionCategories.includes(category);

  return matchesQuery && matchesCategory && matchesTransactionFilter(transaction, transactionFilter);
}

function matchesTransactionFilter(transaction: Transaction, transactionFilter: TransactionFilter) {
  switch (transactionFilter) {
    case "Expenses":
      return transaction.amount < 0 && !isUpcomingTransaction(transaction);
    case "Income":
      return transaction.amount > 0;
    case "Upcoming":
      return getTransactionStatus(transaction) === "Upcoming";
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

export function getPaymentBalanceDelta(paymentTestResult: PaymentTestResult | null, availableBalance: number | null) {
  if (paymentTestResult?.baselineBalance === undefined || paymentTestResult.baselineBalance === null || availableBalance === null) {
    return null;
  }

  return availableBalance - paymentTestResult.baselineBalance;
}

export function getPaymentTransactionDelta(paymentTestResult: PaymentTestResult | null, transactionCount: number) {
  if (typeof paymentTestResult?.baselineTransactionCount !== "number") {
    return null;
  }

  return transactionCount - paymentTestResult.baselineTransactionCount;
}

export function getPaymentFeedNote(paymentTestResult: PaymentTestResult | null, paymentBalanceDelta: number | null, paymentTransactionDelta: number | null) {
  if (paymentTestResult?.status !== "submitted" || paymentBalanceDelta === null || paymentBalanceDelta === 0 || paymentTransactionDelta !== 0) {
    return "";
  }

  return "The provider updated balances, but no matching row was published into the transactions feed yet.";
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

  return isConnected ? "Transactions are loading from Akahu." : "No connected user data loaded.";
}

export function getDataSourceLabel(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "checking connection";
  }

  if (dataMode === "demo") {
    return "Akahu-shaped demo data";
  }

  return isConnected ? "Akahu" : "no connected user";
}

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
    return dataMode === "demo" ? "Demo data unavailable." : "User data unavailable.";
  }

  return dataMode === "demo" ? "Demo data." : "Akahu connected.";
}

export function getCardFitSourceLabel(dataMode: DataMode, isConnected: boolean) {
  if (dataMode === "demo") {
    return "Akahu-shaped demo transactions";
  }

  return isConnected ? "connected Akahu transactions" : "connected user transactions";
}

export function getCardFitWindowLabel(cardBasis: { latestTransactionDate: string | null; windowDays: number }) {
  if (!cardBasis.latestTransactionDate) {
    return `Last ${cardBasis.windowDays} days`;
  }

  return `Last ${cardBasis.windowDays} days ending ${cardBasis.latestTransactionDate}`;
}

export function getPaymentTestHelp(linkedUserName: string, dataMode: DataMode) {
  if (linkedUserName && dataMode === "user") {
    return `Payment testing is disabled on the Akahu data branch. Connected user: ${linkedUserName}.`;
  }

  return "Payment testing is disabled on the Akahu data branch.";
}
