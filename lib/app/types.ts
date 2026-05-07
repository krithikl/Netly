export type View = "home" | "transactions" | "budgets" | "cards" | "connect" | "payment" | "settings";

export type DataMode = "user" | "demo";

export type TransactionFilter = "All" | "Expenses" | "Income" | "Upcoming";

export type TransactionSort = "Newest" | "Oldest" | "Amount high" | "Amount low";

export type PaymentTestForm = {
  amount: string;
  creditorAccount: string;
  creditorName: string;
  reference: string;
  particulars: string;
  code: string;
};

export type PaymentTestResult = {
  status: "submitted" | "error";
  paymentId?: string;
  paymentStatus?: string;
  consentId?: string;
  error?: string;
  baselineBalance?: number | null;
  baselineTransactionCount?: number;
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
