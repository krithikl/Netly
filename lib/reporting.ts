import { categoriesMatch } from "@/lib/category-rules";

// Checks income inclusion with the same normalisation used by category edits.
export function isIncomeCategoryIncluded(category: string, includedIncomeCategories: string[]) {
  return includedIncomeCategories.some((includedCategory) => categoriesMatch(includedCategory, category));
}
