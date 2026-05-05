export type Transaction = {
  id: string;
  date: string;
  rawDescription: string;
  merchant: string;
  category: string;
  account: string;
  amount: number;
  status: "Booked" | "Pending" | "Upcoming";
  confidence: number;
  needsReview: boolean;
  note?: string;
};

export type RawBankTransaction = {
  id: string;
  date: string;
  description: string;
  account: string;
  amount: number;
  status: "Booked" | "Pending" | "Upcoming";
};

export type PeriodOption = "This month" | "30 days" | "90 days" | "All";

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

export type Budget = {
  category: string;
  limit: number;
  color: string;
};
