export const needsReviewCategory = "Needs review";
export const categoryRollupCategory = "Smaller categories";

// Akahu personal finance groups used as Netly's default category set.
export const defaultTransactionCategories = [
  "Appearance",
  "Education",
  "Food",
  "Health",
  "Household",
  "Housing",
  "Lifestyle",
  "Professional Services",
  "Transport",
  "Utilities",
  needsReviewCategory
];

export const netlyPalette = [
  "#D81B60", "#8E24AA", "#3949AB", "#1E88E5", "#00ACC1",
  "#00897B", "#43A047", "#7CB342", "#FDD835", "#FB8C00",
  "#E53935", "#6D4C41", "#546E7A", "#C0CA33", "#5E35B1"
];

// Default colours used before a user customises category settings.
export const defaultCategoryColors: Record<string, string> = {
  Appearance: "#D81B60",
  Education: "#3949AB",
  Food: "#43A047",
  Health: "#00ACC1",
  Household: "#FB8C00",
  Housing: "#6D4C41",
  Lifestyle: "#8E24AA",
  "Professional Services": "#546E7A",
  [categoryRollupCategory]: "#7CB342",
  Transport: "#1E88E5",
  Utilities: "#FDD835",
  [needsReviewCategory]: "#E53935"
};
