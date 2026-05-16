export type View = "home" | "transactions" | "budgets" | "cards" | "connect" | "settings";

export type DataMode = "user" | "demo";

export type TransactionFilter = "All" | "Expenses" | "Income";

export type TransactionSort = "Newest" | "Oldest" | "Amount high" | "Amount low";

export type TransactionAccountOption = {
  label: string;
  value: string;
};

export type LinkedAccount = {
  accountId: string;
  displayName: string;
  identification: string;
  currency: string;
  accountType: string;
  accountSubType: string;
  ownerName?: string;
};

export type AccountDataFreshness = {
  accountId: string;
  displayName: string;
  status: string;
  balanceRefreshedAt: string | null;
  transactionsRefreshedAt: string | null;
};

export type AkahuDataFreshness = {
  accounts: AccountDataFreshness[];
  balanceRefreshedAt: string | null;
  error: string;
  isStale: boolean;
  retrievedAt: string | null;
  status: "idle" | "loading" | "refreshing" | "refreshed" | "failed";
  transactionsRefreshedAt: string | null;
};
