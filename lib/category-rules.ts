import { needsReviewCategory } from "@/lib/categories";
import type { Transaction } from "@/lib/types";

export type CategoryEditScope = "transaction" | "similar";
export type CategoryRuleMap = Record<string, string>;

const ampersandPattern = /\s*&\s*/g;
const whitespacePattern = /\s+/g;

export function getRawAkahuPersonalFinanceCategory(transaction: Transaction) {
  return normalizeDisplayText(transaction.category?.groups?.personal_finance?.name);
}

export function getRawAkahuCategory(transaction: Transaction) {
  return normalizeDisplayText(transaction.category?.name);
}

export function getTransactionCategory(transaction: Transaction) {
  return normalizeDisplayText(
    transaction.netly?.categoryOverride
    || transaction.netly?.categoryRule
    || getRawAkahuPersonalFinanceCategory(transaction)
    || getRawAkahuCategory(transaction)
  ) || needsReviewCategory;
}

export function transactionNeedsReview(transaction: Transaction) {
  return getTransactionCategory(transaction) === needsReviewCategory;
}

export function applyCategoryPreferences(
  transactions: Transaction[],
  categoryOverrides: Record<string, string>,
  categoryRules: CategoryRuleMap
) {
  return transactions.map((transaction) => applyCategoryPreference(transaction, categoryOverrides, categoryRules));
}

export function applyCategoryPreference(
  transaction: Transaction,
  categoryOverrides: Record<string, string>,
  categoryRules: CategoryRuleMap
) {
  const categoryOverride = normalizeDisplayText(categoryOverrides[getCategoryTransactionId(transaction)]);
  const categoryRule = normalizeDisplayText(categoryRules[getCategoryLearningRuleKey(transaction)]);
  const netlyFields = {
    ...transaction.netly,
    categoryOverride: categoryOverride || undefined,
    categoryRule: categoryOverride ? undefined : categoryRule || undefined
  };
  const nextNetlyFields = removeEmptyValues(netlyFields);

  if (Object.keys(nextNetlyFields).length === 0) {
    return {
      ...transaction,
      netly: undefined
    };
  }

  return {
    ...transaction,
    netly: nextNetlyFields
  };
}

export function getCategoryLearningRuleKey(transaction: Transaction) {
  const merchantKey = transaction.merchant?._id
    ? `merchant-id:${normalizeCategoryLabel(transaction.merchant._id)}`
    : `merchant-name:${normalizeCategoryLabel(getCategoryMerchant(transaction))}`;
  const sourceCategoryKey = transaction.category?._id
    ? `category-id:${normalizeCategoryLabel(transaction.category._id)}`
    : `category-name:${normalizeCategoryLabel(getRawAkahuCategory(transaction) || needsReviewCategory)}`;
  const groupKey = `group:${normalizeCategoryLabel(getRawAkahuPersonalFinanceCategory(transaction) || needsReviewCategory)}`;

  return [merchantKey, sourceCategoryKey, groupKey].join("|");
}

export function categoriesMatch(first: string | undefined, second: string | undefined) {
  return normalizeCategoryLabel(first) === normalizeCategoryLabel(second);
}

export function normalizeDisplayText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(whitespacePattern, " ") : "";
}

export function normalizeCategoryLabel(value: unknown) {
  return normalizeDisplayText(value)
    .toLowerCase()
    .replace(ampersandPattern, " and ")
    .replace(whitespacePattern, " ");
}

function removeEmptyValues(fields: NonNullable<Transaction["netly"]>) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== "")
  ) as NonNullable<Transaction["netly"]>;
}

function getCategoryTransactionId(transaction: Transaction) {
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

function getCategoryMerchant(transaction: Transaction) {
  return firstUsefulText([
    transaction.merchant?.name,
    transaction.meta?.particulars,
    transaction.meta?.reference,
    transaction.description
  ]);
}

function firstUsefulText(values: Array<unknown>, fallback = "Unknown transaction") {
  const value = values.find((item) => typeof item === "string" && item.trim().length > 0);
  return String(value || fallback).trim();
}
