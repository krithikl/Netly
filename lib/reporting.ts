import { categoriesMatch } from "@/lib/category-rules";

// Checks category exclusions with the same normalisation used by category edits.
export function isIncomeCategoryExcluded(category: string, excludedIncomeCategories: string[]) {
  return excludedIncomeCategories.some((excludedCategory) => categoriesMatch(excludedCategory, category));
}
