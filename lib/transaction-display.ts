import type { Transaction } from "@/lib/types";
import {
  getRawAkahuCategory,
  getRawAkahuPersonalFinanceCategory,
  getTransactionCategory as getEffectiveTransactionCategory,
  transactionNeedsReview as getEffectiveTransactionNeedsReview
} from "@/lib/category-rules";
export {
  formatTransactionDateHeading,
  groupTransactionsByDate,
  type TransactionDateGroup
} from "@/lib/transaction-date-groups";

export type TransactionStatus = "Booked";

const currencyFormatters = new Map<string, Intl.NumberFormat>();

// Returns a stable transaction ID, even when Akahu does not send one
export function getTransactionId(transaction: Transaction) {
  if (transaction._id) {
    return transaction._id;
  }

  return [
    "transaction",
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2)
  ].join(":");
}

export function getTransactionDate(transaction: Transaction) {
  return transaction.date.slice(0, 10);
}

export function getTransactionTimestamp(transaction: Transaction) {
  const dateTimestamp = getUsableTransactionTimestamp(transaction.date);

  if (Number.isFinite(dateTimestamp)) {
    return dateTimestamp;
  }

  const dateOnlyTimestamp = Date.parse(`${getTransactionDate(transaction)}T00:00:00`);
  return Number.isFinite(dateOnlyTimestamp) ? dateOnlyTimestamp : 0;
}

export function getTransactionFallbackSortTimestamp(transaction: Transaction) {
  const createdTimestamp = getUsableTransactionTimestamp(transaction.created_at);

  if (Number.isFinite(createdTimestamp)) {
    return createdTimestamp;
  }

  const updatedTimestamp = getUsableTransactionTimestamp(transaction.updated_at);

  if (Number.isFinite(updatedTimestamp)) {
    return updatedTimestamp;
  }

  return 0;
}

// Matches the Transactions page default order: newest transaction date first, then source timing.
export function compareTransactionsNewestFirst(first: Transaction, second: Transaction) {
  const dateDifference = getTransactionTimestamp(second) - getTransactionTimestamp(first);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  const fallbackDifference = getTransactionFallbackSortTimestamp(second) - getTransactionFallbackSortTimestamp(first);

  if (fallbackDifference !== 0) {
    return fallbackDifference;
  }

  return getTransactionId(second).localeCompare(getTransactionId(first));
}

function getUsableTransactionTimestamp(value: string | undefined) {
  if (!value) {
    return Number.NaN;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

export function getTransactionStatus(transaction: Transaction): TransactionStatus {
  return "Booked";
}

// Picks the best merchant name available for display
// Chooses the best merchant label for transaction rows and search.
export function getTransactionMerchant(transaction: Transaction) {
  return firstUsefulText([
    transaction.merchant?.name,
    transaction.meta?.particulars,
    transaction.meta?.reference,
    transaction.description
  ]);
}

// Picks the category to show, with local edits taking priority
// Resolves a transaction category, preferring user overrides.
export function getTransactionCategory(transaction: Transaction) {
  return getEffectiveTransactionCategory(transaction);
}

export function getTransactionAccountLabel(transaction: Transaction) {
  return firstUsefulText([
    transaction.netly?.accountName,
    transaction._account,
    transaction.meta?.other_account
  ], "Akahu account");
}

export function getTransactionCurrency(transaction: Transaction) {
  return transaction.netly?.accountCurrency || "NZD";
}

export function getTransactionAmountLabel(transaction: Transaction) {
  return formatTransactionMoney(transaction.amount, getTransactionCurrency(transaction));
}

export function getTransactionDetailText(transaction: Transaction) {
  return [
    getTypeDetail(transaction),
    getBalanceDetail(transaction),
    getCardDetail(transaction),
    getReferenceDetail(transaction),
    getOtherAccountDetail(transaction),
    getConversionDetail(transaction)
  ]
    .filter(isUsefulText)
    .join(" · ");
}

export function getTransactionSummaryMeta(transaction: Transaction) {
  return [
    getTransactionDate(transaction),
    getTransactionCategory(transaction),
    getTransactionAccountLabel(transaction),
    getTransactionStatus(transaction)
  ].join(" · ");
}

// Builds transaction detail rows and skips empty fields
export function getTransactionDetailRows(transaction: Transaction) {
  return [
    { label: "Status", value: getTransactionStatus(transaction) },
    { label: "Made", value: getLifecycleDateValue(getTransactionDate(transaction)) },
    { label: "Booked / resolved", value: getLifecycleDateValue(transaction.updated_at || transaction.created_at) },
    { label: "Account", value: getTransactionAccountLabel(transaction) },
    { label: "Currency", value: getTransactionCurrency(transaction) },
    { label: "Type", value: transaction.type },
    { label: "Category", value: getTransactionCategory(transaction) },
    { label: "Akahu group", value: getRawAkahuPersonalFinanceCategory(transaction) },
    { label: "Akahu category", value: getRawAkahuCategory(transaction) },
    { label: "Merchant", value: transaction.merchant?.name },
    { label: "Card suffix", value: transaction.meta?.card_suffix },
    { label: "Balance after", value: getBalanceValue(transaction) },
    { label: "Other account", value: transaction.meta?.other_account },
    { label: "Original amount", value: getConversionValue(transaction) },
    { label: "Payment reference", value: getPaymentReferenceValue(transaction) },
    { label: "Akahu ID", value: transaction._id },
    { label: "Account ID", value: transaction._account },
    { label: "Connection ID", value: transaction._connection }
  ].filter(hasDetailValue);
}

// Combines bank-provided text into one string for search and details
export function getTransactionSearchText(transaction: Transaction) {
  return [
    transaction.description,
    transaction.merchant?.name,
    getTransactionCategory(transaction),
    transaction.category?.name,
    transaction.category?.groups?.personal_finance?.name,
    transaction.meta?.particulars,
    transaction.meta?.code,
    transaction.meta?.reference,
    transaction.type
  ]
    .filter(isUsefulText)
    .join(" | ");
}

// Shows only source payment/bank fields, not Akahu enrichment or Netly labels.
export function getTransactionRawBankText(transaction: Transaction) {
  return [
    transaction.description,
    transaction.meta?.particulars,
    transaction.meta?.code,
    transaction.meta?.reference,
    transaction.meta?.other_account,
    transaction.type
  ]
    .filter(isUsefulText)
    .join(" | ");
}

// Scores how reliable the category looks
export function getTransactionConfidence(transaction: Transaction) {
  if (transaction.netly?.categoryOverride || transaction.netly?.categoryRule) {
    return 1;
  }

  if (!transactionNeedsReview(transaction)) {
    return 0.95;
  }

  return 0.35;
}

// Flags transactions whose inferred category should be checked by a user.
export function transactionNeedsReview(transaction: Transaction) {
  return getEffectiveTransactionNeedsReview(transaction);
}

function firstUsefulText(values: Array<unknown>, fallback = "Unknown transaction") {
  const value = values.find(isUsefulText);
  return String(value || fallback).trim();
}

function isUsefulText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getTypeDetail(transaction: Transaction) {
  return transaction.type ? `Type: ${transaction.type}` : "";
}

function getBalanceDetail(transaction: Transaction) {
  if (typeof transaction.balance !== "number") {
    return "";
  }

  const balance = getBalanceValue(transaction);

  return `Balance after: ${balance}`;
}

function getCardDetail(transaction: Transaction) {
  return transaction.meta?.card_suffix ? `Card: ${transaction.meta.card_suffix}` : "";
}

function getReferenceDetail(transaction: Transaction) {
  const reference = [
    transaction.meta?.particulars,
    transaction.meta?.code,
    transaction.meta?.reference
  ]
    .filter(isUsefulText)
    .join(" ");

  return reference ? `Reference: ${reference}` : "";
}

function getOtherAccountDetail(transaction: Transaction) {
  return transaction.meta?.other_account ? `Other account: ${transaction.meta.other_account}` : "";
}

function getConversionDetail(transaction: Transaction) {
  const convertedAmount = getConversionValue(transaction);

  return convertedAmount ? `Original: ${convertedAmount}` : "";
}

function getBalanceValue(transaction: Transaction) {
  if (typeof transaction.balance !== "number") {
    return "";
  }

  return formatTransactionMoney(transaction.balance, getTransactionCurrency(transaction));
}

function formatTransactionMoney(amount: number, currency: string) {
  return getCurrencyFormatter(currency).format(amount);
}

function getCurrencyFormatter(currency: string) {
  const formatter = currencyFormatters.get(currency);

  if (formatter) {
    return formatter;
  }

  const nextFormatter = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  });

  currencyFormatters.set(currency, nextFormatter);
  return nextFormatter;
}

function getConversionValue(transaction: Transaction) {
  const conversion = transaction.meta?.conversion;

  if (!conversion?.currency || typeof conversion.amount !== "number") {
    return "";
  }

  return formatTransactionMoney(conversion.amount, conversion.currency);
}

function getPaymentReferenceValue(transaction: Transaction) {
  return [
    transaction.meta?.particulars,
    transaction.meta?.code,
    transaction.meta?.reference
  ]
    .filter(isUsefulText)
    .join(" ");
}

function getLifecycleDateValue(value: string | undefined) {
  if (!value) {
    return "";
  }

  const hasTime = value.includes("T");
  const timestamp = Date.parse(hasTime ? value : `${value}T12:00:00`);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    hour: hasTime ? "numeric" : undefined,
    minute: hasTime ? "2-digit" : undefined,
    month: "short",
    year: "numeric"
  }).format(new Date(timestamp));
}

function hasDetailValue(row: { label: string; value?: unknown }): row is { label: string; value: string } {
  return typeof row.value === "string" && row.value.trim().length > 0;
}
