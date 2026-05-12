"use client";

import { useCallback, useMemo, useState } from "react";
import {
  categoryColorsStorageKey,
  categoryOverridesStorageKey,
  customCategoriesStorageKey,
  deletedCategoriesStorageKey
} from "@/lib/app/constants";
import { readCategoryColors, readCategoryOverrides, readCustomCategories, readDeletedCategories } from "@/lib/app/browser-state";
import { defaultCategoryColors, defaultTransactionCategories } from "@/lib/categories";
import { getTransactionCategory } from "@/lib/transaction-display";
import type { Transaction } from "@/lib/types";

// Manages saved category edits, custom categories, removed categories, and colors
export function useCategorySettings(
  transactions: Transaction[],
  categories: { category: string; amount: number }[]
) {
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [deletedCategories, setDeletedCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(defaultCategoryColors);

  const transactionCategoryOptions = useMemo(
    () => getTransactionCategoryOptions(transactions, categories, customCategories, deletedCategories),
    [categories, customCategories, deletedCategories, transactions]
  );

  const restoreCategorySettings = useCallback(() => {
    setCategoryOverrides(readCategoryOverrides());
    setCustomCategories(readCustomCategories());
    setDeletedCategories(readDeletedCategories());
    setCategoryColors(readCategoryColors());
  }, []);

  const updateTransactionCategory = useCallback((transactionId: string, category: string) => {
    const next = {
      ...categoryOverrides,
      [transactionId]: category
    };

    setCategoryOverrides(next);
    window.localStorage.setItem(categoryOverridesStorageKey, JSON.stringify(next));
  }, [categoryOverrides]);

  const createCustomCategory = useCallback((category: string) => {
    const normalizedCategory = normalizeCustomCategory(category);
    const categoryExists = getCategoryExists(transactionCategoryOptions, normalizedCategory);

    if (!normalizedCategory || categoryExists) {
      return;
    }

    const nextCategories = [...customCategories, normalizedCategory].sort();
    setCustomCategories(nextCategories);
    window.localStorage.setItem(customCategoriesStorageKey, JSON.stringify(nextCategories));
  }, [customCategories, transactionCategoryOptions]);

  const deleteCategory = useCallback((category: string) => {
    const next = [...deletedCategories, category];
    setDeletedCategories(next);
    window.localStorage.setItem(deletedCategoriesStorageKey, JSON.stringify(next));
  }, [deletedCategories]);

  const updateCategoryColor = useCallback((category: string, color: string) => {
    const next = { ...categoryColors, [category]: color };
    setCategoryColors(next);
    window.localStorage.setItem(categoryColorsStorageKey, JSON.stringify(next));
  }, [categoryColors]);

  return {
    categoryColors,
    categoryOverrides,
    createCustomCategory,
    deleteCategory,
    restoreCategorySettings,
    transactionCategoryOptions,
    updateCategoryColor,
    updateTransactionCategory
  };
}

// Builds one sorted category list for filters and category selectors
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
  categorySet.delete("Income");
  deletedCategories.forEach((category) => categorySet.delete(category));

  return ["All categories", ...[...categorySet].sort()];
}

function normalizeCustomCategory(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function getCategoryExists(categories: string[], category: string) {
  return categories.some((currentCategory) => currentCategory.toLowerCase() === category.toLowerCase());
}
