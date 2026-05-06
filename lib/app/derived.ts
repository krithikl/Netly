import type { DataMode, LinkedAccount, PaymentTestResult, TransactionFilter, TransactionSort } from "@/lib/app/types";
import type { Transaction } from "@/lib/types";

export function applyCategoryOverrides(transactions: Transaction[], categoryOverrides: Record<string, string>) {
  return transactions.map((transaction) => {
    const override = categoryOverrides[transaction.id];

    if (!override) {
      return transaction;
    }

    return {
      ...transaction,
      category: override,
      confidence: 1,
      needsReview: false,
      note: "Manually categorized"
    };
  });
}

export function getVisibleTransactions(
  transactions: Transaction[],
  query: string,
  transactionCategory: string,
  transactionFilter: TransactionFilter,
  transactionSort: TransactionSort
) {
  return transactions
    .filter((transaction) => matchesTransactionFilters(transaction, query, transactionCategory, transactionFilter))
    .sort((first, second) => compareTransactions(first, second, transactionSort));
}

function matchesTransactionFilters(transaction: Transaction, query: string, transactionCategory: string, transactionFilter: TransactionFilter) {
  const searchableText = `${transaction.merchant} ${transaction.category} ${transaction.account} ${transaction.rawDescription}`.toLowerCase();
  const matchesQuery = searchableText.includes(query.trim().toLowerCase());
  const matchesCategory = transactionCategory === "All categories" || transaction.category === transactionCategory;

  return matchesQuery && matchesCategory && matchesTransactionFilter(transaction, transactionFilter);
}

function matchesTransactionFilter(transaction: Transaction, transactionFilter: TransactionFilter) {
  switch (transactionFilter) {
    case "Expenses":
      return transaction.amount < 0 && transaction.status !== "Upcoming";
    case "Income":
      return transaction.amount > 0;
    case "Upcoming":
      return transaction.status === "Upcoming";
    default:
      return true;
  }
}

function compareTransactions(first: Transaction, second: Transaction, transactionSort: TransactionSort) {
  switch (transactionSort) {
    case "Oldest":
      return first.date.localeCompare(second.date);
    case "Amount high":
      return Math.abs(second.amount) - Math.abs(first.amount);
    case "Amount low":
      return Math.abs(first.amount) - Math.abs(second.amount);
    default:
      return second.date.localeCompare(first.date);
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

  return "PNZ accepted the payment and updated balances, but this sandbox has not published a matching row into the transactions feed.";
}

export function getConnectionTitle(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "Checking sandbox";
  }

  if (dataMode === "demo") {
    return "Demo data";
  }

  return isConnected ? "PNZ sandbox connected" : "Sandbox ready";
}

export function getConnectionCopy(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "Loading available transaction data.";
  }

  if (dataMode === "demo") {
    return "Using PNZ-format sample transactions.";
  }

  return isConnected ? "Transactions are loading from PNZ." : "No connected user data loaded.";
}

export function getDataSourceLabel(isLoadingTransactions: boolean, dataMode: DataMode, isConnected: boolean) {
  if (isLoadingTransactions) {
    return "checking connection";
  }

  if (dataMode === "demo") {
    return "PNZ-format demo data";
  }

  return isConnected ? "Payments NZ sandbox" : "no connected user";
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

  return dataMode === "demo" ? "Demo data." : "PNZ sandbox connected.";
}

export function getCardFitSourceLabel(dataMode: DataMode, isConnected: boolean) {
  if (dataMode === "demo") {
    return "PNZ-format demo transactions";
  }

  return isConnected ? "connected PNZ transactions" : "connected user transactions";
}

export function getCardFitWindowLabel(cardBasis: { latestTransactionDate: string | null; windowDays: number }) {
  if (!cardBasis.latestTransactionDate) {
    return `Last ${cardBasis.windowDays} days`;
  }

  return `Last ${cardBasis.windowDays} days ending ${cardBasis.latestTransactionDate}`;
}

export function getPaymentTestHelp(linkedUserName: string, dataMode: DataMode) {
  if (linkedUserName && dataMode === "user") {
    return `For outgoing payment tests, authorize the payment as ${linkedUserName}, the same sandbox user connected to MoneyFit. If you log in as another sandbox user, MoneyFit will only see it when that user pays one of ${linkedUserName}'s linked accounts.`;
  }

  return "For outgoing payment tests, authorize the payment as the same sandbox user connected to MoneyFit. If you log in as another sandbox user, set the creditor account to the connected user's account to simulate incoming money.";
}
