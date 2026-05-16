import type { DataMode, LinkedAccount } from "@/lib/app/types";

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
