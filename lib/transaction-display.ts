import type { Transaction } from "@/lib/types";
import { mapSourceCategoryToNetlyCategory } from "@/lib/category-mapping";

export type TransactionStatus = "Booked" | "Pending";

// Returns a stable transaction ID, even when Akahu does not send one
export function getTransactionId(transaction: Transaction) {
  if (transaction._id) {
    return transaction._id;
  }

  return [
    "pending",
    transaction._account || "account",
    transaction.date,
    transaction.description,
    transaction.amount.toFixed(2)
  ].join(":");
}

export function getTransactionDate(transaction: Transaction) {
  return transaction.date.slice(0, 10);
}

export function getTransactionStatus(transaction: Transaction): TransactionStatus {
  if (transaction.pending) {
    return "Pending";
  }

  return "Booked";
}

// Picks the best merchant name available for display
export function getTransactionMerchant(transaction: Transaction) {
  return firstUsefulText([
    transaction.merchant?.name,
    transaction.meta?.particulars,
    transaction.meta?.reference,
    transaction.description
  ]);
}

// Picks the category to show, with local edits taking priority
export function getTransactionCategory(transaction: Transaction) {
  if (transaction.netly?.categoryOverride) {
    return transaction.netly.categoryOverride;
  }

  return mapSourceCategoryToNetlyCategory(
    firstUsefulText([
      transaction.category?.groups?.personal_finance?.name,
      transaction.category?.name
    ], "")
  );
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
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: getTransactionCurrency(transaction),
    maximumFractionDigits: 2
  }).format(transaction.amount);
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
    { label: "Account", value: getTransactionAccountLabel(transaction) },
    { label: "Currency", value: getTransactionCurrency(transaction) },
    { label: "Type", value: transaction.type },
    { label: "Category", value: getTransactionCategory(transaction) },
    { label: "Akahu category", value: transaction.category?.name },
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

// Combines raw bank text into one string for search and details
export function getTransactionRawText(transaction: Transaction) {
  return [
    transaction.description,
    transaction.merchant?.name,
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

// Scores how reliable the category looks
export function getTransactionConfidence(transaction: Transaction) {
  if (transaction.netly?.categoryOverride) {
    return 1;
  }

  if (getTransactionCategory(transaction) !== "Needs review") {
    return 0.95;
  }

  return 0.35;
}

export function transactionNeedsReview(transaction: Transaction) {
  return getTransactionCategory(transaction) === "Needs review";
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

  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: getTransactionCurrency(transaction),
    maximumFractionDigits: 2
  }).format(transaction.balance);
}

function getConversionValue(transaction: Transaction) {
  const conversion = transaction.meta?.conversion;

  if (!conversion?.currency || typeof conversion.amount !== "number") {
    return "";
  }

  const convertedAmount = new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: conversion.currency,
    maximumFractionDigits: 2
  }).format(conversion.amount);

  return convertedAmount;
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

function hasDetailValue(row: { label: string; value?: unknown }): row is { label: string; value: string } {
  return typeof row.value === "string" && row.value.trim().length > 0;
}
