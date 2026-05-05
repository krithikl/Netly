import type { RawBankTransaction, Transaction } from "./types";

type CategorizationRule = {
  category: string;
  merchant: string;
  patterns: RegExp[];
};

const rules: CategorizationRule[] = [
  { category: "Groceries", merchant: "Woolworths", patterns: [/woolworths/i, /countdown/i] },
  { category: "Groceries", merchant: "New World", patterns: [/new world/i] },
  { category: "Groceries", merchant: "Pak'nSave", patterns: [/pak'?n?save/i, /pns/i] },
  { category: "Groceries", merchant: "Farro Fresh", patterns: [/farro/i] },
  { category: "Eating out", merchant: "Best Ugly Bagels", patterns: [/best ugly/i, /bagel/i] },
  { category: "Eating out", merchant: "Coffee Lab", patterns: [/coffee/i, /cafe/i] },
  { category: "Eating out", merchant: "Amano", patterns: [/amano/i] },
  { category: "Eating out", merchant: "Uber Eats", patterns: [/uber eats/i] },
  { category: "Eating out", merchant: "Burger Burger", patterns: [/burger burger/i] },
  { category: "Transport", merchant: "AT HOP", patterns: [/at hop/i, /auckland transport/i] },
  { category: "Transport", merchant: "Uber", patterns: [/uber trip/i, /^uber\s/i] },
  { category: "Transport", merchant: "Lime", patterns: [/lime/i] },
  { category: "Fuel", merchant: "Z Energy", patterns: [/\bz energy\b/i, /\bz station\b/i] },
  { category: "Subscriptions", merchant: "Spotify", patterns: [/spotify/i] },
  { category: "Subscriptions", merchant: "Netflix", patterns: [/netflix/i] },
  { category: "Subscriptions", merchant: "Disney+", patterns: [/disney/i] },
  { category: "Subscriptions", merchant: "Apple iCloud", patterns: [/apple.*icloud/i, /icloud/i] },
  { category: "Utilities", merchant: "Mercury Energy", patterns: [/mercury/i] },
  { category: "Utilities", merchant: "Spark", patterns: [/\bspark\b/i] },
  { category: "Housing", merchant: "Rent", patterns: [/rent/i, /property/i, /landlord/i] },
  { category: "Health", merchant: "Chemist Warehouse", patterns: [/chemist/i, /pharmacy/i] },
  { category: "Health", merchant: "Southern Cross", patterns: [/southern cross/i] },
  { category: "Shopping", merchant: "Kmart", patterns: [/kmart/i] },
  { category: "Shopping", merchant: "Hallenstein Brothers", patterns: [/hallenstein/i] },
  { category: "Shopping", merchant: "Bunnings", patterns: [/bunnings/i] },
  { category: "Travel", merchant: "Auckland Airport Parking", patterns: [/airport.*parking/i] },
  { category: "Entertainment", merchant: "Hoyts", patterns: [/hoyts/i] },
  { category: "Transfers", merchant: "Transfer to Savings", patterns: [/transfer.*savings/i] },
  { category: "Transfers", merchant: "Bank transfer", patterns: [/receivedcredittransfer.*domesticcredittransfer.*transfer/i] },
  { category: "Fees", merchant: "Wise FX Fee", patterns: [/wise.*fee/i, /fx fee/i] },
  { category: "Income", merchant: "Salary", patterns: [/salary/i, /payroll/i, /wages/i] }
];

export function categorizeTransaction(raw: RawBankTransaction): Transaction {
  const match = rules.find((rule) => rule.patterns.some((pattern) => pattern.test(raw.description)));
  const fallback = inferFallback(raw.description, raw.amount);

  return {
    id: raw.id,
    date: raw.date,
    rawDescription: raw.description,
    merchant: match?.merchant || fallback.merchant,
    category: match?.category || fallback.category,
    account: raw.account,
    amount: raw.amount,
    status: raw.status,
    confidence: match ? 0.92 : fallback.confidence,
    needsReview: match ? false : fallback.confidence < 0.65,
    note: match ? "Matched by merchant rule" : "Low-confidence inference from bank description"
  };
}

function inferFallback(description: string, amount: number) {
  const cleaned = description
    .replace(/\bvisa\b/gi, "")
    .replace(/\beftpos\b/gi, "")
    .replace(/\bonline\b/gi, "")
    .replace(/\d{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const displayName = cleaned
    .split("|")
    .map((part) => part.trim())
    .find((part) => part && !/^further details about the transaction$/i.test(part));

  if (amount > 0) {
    return { merchant: displayName || cleaned || "Unknown credit", category: "Income", confidence: 0.52 };
  }

  if (/fee|charge|surcharge/i.test(description)) {
    return { merchant: displayName || cleaned || "Unknown fee", category: "Fees", confidence: 0.58 };
  }

  return {
    merchant: displayName || cleaned || "Unknown merchant",
    category: "Needs review",
    confidence: 0.35
  };
}

export function categorizeTransactions(raw: RawBankTransaction[]) {
  return raw.map(categorizeTransaction);
}
