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
