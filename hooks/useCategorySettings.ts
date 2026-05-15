"use client";

import { useCallback, useMemo, useState } from "react";
import {
  categoryColorsStorageKey,
  categoryOverridesStorageKey,
  categoryRulesStorageKey,
  customCategoriesStorageKey,
  deletedCategoriesStorageKey
} from "@/lib/app/constants";
import {
  readCategoryColors,
  readCategoryOverrides,
  readCategoryRules,
  readCustomCategories,
  readDeletedCategories,
  resetOutdatedCategorySettings
} from "@/lib/app/browser-state";
import { categoryRollupCategory, defaultCategoryColors, defaultTransactionCategories, needsReviewCategory, netlyPalette } from "@/lib/categories";
import {
  applyCategoryPreferences,
  categoriesMatch,
  getCategoryLearningRuleKey,
  getRawAkahuPersonalFinanceCategory,
  normalizeDisplayText,
  type CategoryEditScope,
  type CategoryRuleMap
} from "@/lib/category-rules";
import { getTransactionCategory } from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

// Manages saved category edits, custom categories, removed categories, and colors
// Manages saved category overrides, custom categories, hidden categories, and colours.
export function useCategorySettings(
  transactions: Transaction[],
  categories: { category: string; amount: number }[]
) {
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [categoryRules, setCategoryRules] = useState<CategoryRuleMap>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(defaultCategoryColors);
  const categorizedTransactions = useMemo(
    () => applyCategoryPreferences(transactions, categoryOverrides, categoryRules),
    [categoryOverrides, categoryRules, transactions]
  );

  const transactionCategoryOptions = useMemo(
    () => getTransactionCategoryOptions(categorizedTransactions, categories, customCategories, deletedCategories),
    [categories, categorizedTransactions, customCategories, deletedCategories]
  );
  const settingsCategoryOptions = useMemo(
    () => getSettingsCategoryOptions(customCategories, deletedCategories),
    [customCategories, deletedCategories]
  );

  const restoreCategorySettings = useCallback(() => {
    resetOutdatedCategorySettings();
    setCategoryOverrides(readCategoryOverrides());
    setCategoryRules(readCategoryRules());
    setCustomCategories(readCustomCategories());
    setDeletedCategories(readDeletedCategories());
    setCategoryColors(readCategoryColors());
  }, []);

  const updateTransactionCategory = useCallback((transaction: Transaction, category: string, scope: CategoryEditScope) => {
    const normalizedCategory = normalizeDisplayText(category);
    const rawAkahuGroup = getRawAkahuPersonalFinanceCategory(transaction) || needsReviewCategory;
    const ruleKey = getCategoryLearningRuleKey(transaction);

    if (scope === "similar") {
      const nextRules = { ...categoryRules };
      const nextOverrides = { ...categoryOverrides };
      delete nextOverrides[getTransactionId(transaction)];

      if (categoriesMatch(normalizedCategory, rawAkahuGroup)) {
        delete nextRules[ruleKey];
      } else {
        nextRules[ruleKey] = normalizedCategory;
      }

      setCategoryRules(nextRules);
      setCategoryOverrides(nextOverrides);
      window.localStorage.setItem(categoryRulesStorageKey, JSON.stringify(nextRules));
      window.localStorage.setItem(categoryOverridesStorageKey, JSON.stringify(nextOverrides));
      return;
    }

    const nextOverrides = { ...categoryOverrides };
    const matchingRuleCategory = categoryRules[ruleKey];

    if (categoriesMatch(normalizedCategory, rawAkahuGroup) && !matchingRuleCategory) {
      delete nextOverrides[getTransactionId(transaction)];
    } else {
      nextOverrides[getTransactionId(transaction)] = normalizedCategory;
    }

    setCategoryOverrides(nextOverrides);
    window.localStorage.setItem(categoryOverridesStorageKey, JSON.stringify(nextOverrides));
  }, [categoryOverrides, categoryRules]);

  const createCustomCategory = useCallback((category: string) => {
    const normalizedCategory = normalizeCustomCategory(category);
    const categoryExists = getCategoryExists(transactionCategoryOptions, normalizedCategory);

    if (!normalizedCategory || categoryExists) {
      return;
    }

    const nextCategories = [...customCategories, normalizedCategory].sort();
    const nextDeletedCategories = deletedCategories.filter((deletedCategory) => !categoriesMatch(deletedCategory, normalizedCategory));
    setCustomCategories(nextCategories);
    setDeletedCategories(nextDeletedCategories);
    window.localStorage.setItem(customCategoriesStorageKey, JSON.stringify(nextCategories));
    window.localStorage.setItem(deletedCategoriesStorageKey, JSON.stringify(nextDeletedCategories));
  }, [customCategories, deletedCategories, transactionCategoryOptions]);

  const deleteCategory = useCallback((category: string) => {
    const next = [...deletedCategories, category];
    const nextCustomCategories = customCategories.filter((customCategory) => !categoriesMatch(customCategory, category));
    const nextOverrides = removeCategoryValues(categoryOverrides, category);
    const nextRules = removeCategoryValues(categoryRules, category);

    setDeletedCategories(next);
    setCustomCategories(nextCustomCategories);
    setCategoryOverrides(nextOverrides);
    setCategoryRules(nextRules);
    window.localStorage.setItem(deletedCategoriesStorageKey, JSON.stringify(next));
    window.localStorage.setItem(customCategoriesStorageKey, JSON.stringify(nextCustomCategories));
    window.localStorage.setItem(categoryOverridesStorageKey, JSON.stringify(nextOverrides));
    window.localStorage.setItem(categoryRulesStorageKey, JSON.stringify(nextRules));
  }, [categoryOverrides, categoryRules, customCategories, deletedCategories]);

  const updateCategoryColor = useCallback((category: string, color: string) => {
    if (!netlyPalette.includes(color)) {
      throw new Error(`Invalid category color "${color}". Expected one of the Netly palette colors.`);
    }

    const next = { ...categoryColors, [category]: color };
    setCategoryColors(next);
    window.localStorage.setItem(categoryColorsStorageKey, JSON.stringify(getCategoryColorOverrides(next)));
  }, [categoryColors]);

  return {
    categoryColors,
    categoryOverrides,
    categoryRules,
    createCustomCategory,
    deleteCategory,
    restoreCategorySettings,
    settingsCategoryOptions,
    transactionCategoryOptions,
    updateCategoryColor,
    updateTransactionCategory
  };
}

// Builds one sorted category list for filters and category selectors
// Builds the category dropdown options from defaults, custom values, and live transactions.
function getTransactionCategoryOptions(
  transactions: Transaction[],
  categories: { category: string; amount: number }[],
  customCategories: string[],
  deletedCategories: string[]
) {
  const categorySet = new Set<string>();
  defaultTransactionCategories.forEach((category) => categorySet.add(category));
  categories.forEach((item) => categorySet.add(item.category));
  transactions.forEach((transaction) => categorySet.add(getTransactionCategory(transaction)));
  customCategories.forEach((category) => categorySet.add(category));
  deletedCategories.forEach((category) => categorySet.delete(category));

  return ["All categories", ...[...categorySet].sort()];
}

function getSettingsCategoryOptions(customCategories: string[], deletedCategories: string[]) {
  const categorySet = new Set<string>();
  defaultTransactionCategories.forEach((category) => categorySet.add(category));
  categorySet.add(categoryRollupCategory);
  customCategories.forEach((category) => categorySet.add(category));
  deletedCategories.forEach((category) => categorySet.delete(category));

  return ["All categories", ...[...categorySet].sort()];
}

function normalizeCustomCategory(category: string) {
  return normalizeDisplayText(category);
}

function getCategoryExists(categories: string[], category: string) {
  return categories.some((currentCategory) => categoriesMatch(currentCategory, category));
}

function removeCategoryValues(values: Record<string, string>, category: string) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => !categoriesMatch(value, category))
  );
}

function getCategoryColorOverrides(categoryColors: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(categoryColors).filter(([category, color]) => defaultCategoryColors[category] !== color)
  );
}

function getTransactionId(transaction: Transaction) {
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
