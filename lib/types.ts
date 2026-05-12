export type AkahuCategory = {
  _id?: string;
  name?: string;
  groups?: {
    personal_finance?: {
      _id?: string;
      name?: string;
    };
    [groupName: string]: { _id?: string; name?: string } | undefined;
  };
};

export type AkahuMerchant = {
  _id?: string;
  name?: string;
  website?: string;
};

export type AkahuTransactionMeta = {
  particulars?: string;
  code?: string;
  reference?: string;
  other_account?: string;
  logo?: string;
  card_suffix?: string;
  conversion?: {
    amount?: number;
    currency?: string;
    rate?: number;
  };
  [key: string]: unknown;
};

export type Transaction = {
  _id?: string;
  _account?: string;
  _connection?: string;
  created_at?: string;
  updated_at?: string;
  date: string;
  description: string;
  amount: number;
  balance?: number;
  type?: string;
  merchant?: AkahuMerchant;
  category?: AkahuCategory;
  meta?: AkahuTransactionMeta;
  pending?: boolean;
  netly?: {
    accountName?: string;
    accountCurrency?: string;
    categoryOverride?: string;
  };
};

export type PeriodOption = "This month" | "30 days" | "90 days" | "All";

export type TransactionDateRange = {
  from: string;
  to: string;
};

export type CardProduct = {
  name: string;
  issuer: string;
  network: "American Express" | "Visa" | "Mastercard";
  tier: string;
  annualFee: number;
  cashbackRate: number;
  perksValue: number;
  rewardProgram: string;
  earnDescription: string;
  note: string;
  sourceUrl: string;
  brandColor: string;
};

export type RecurringMerchant = {
  merchant: string;
  category: string;
  count: number;
  average: number;
};

export type CardValue = CardProduct & {
  annualValue: number;
  grossRewards: number;
  eligibleAnnualSpend: number;
};

export type CardFitDriver = {
  category: string;
  annualSpend: number;
  estimatedRewardValue: number;
  shareOfEligibleSpend: number;
};

export type CardFitExplanation = {
  recommendedCardName: string;
  comparisonCardName: string;
  annualDelta: number;
  grossRewardsDelta: number;
  perksDelta: number;
  annualFeeDelta: number;
  drivers: CardFitDriver[];
};

export type CardFitBasis = {
  windowDays: number;
  transactionCount: number;
  eligibleTransactionCount: number;
  excludedTransactionCount: number;
  eligibleSpend: number;
  eligibleAnnualSpend: number;
  latestTransactionDate: string | null;
  categories: { category: string; amount: number }[];
};

export type Budget = {
  category: string;
  limit: number;
};
