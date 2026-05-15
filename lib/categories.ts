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
  "#ef5350", "#ec407a", "#ab47bc", "#7e57c2", "#5c6bc0",
  "#4285f4", "#039be5", "#26c6da", "#43a047", "#7cb342",
  "#c0ca33", "#ffb300", "#f57c00", "#8d6e63", "#607d8b"
];

// Default colours used before a user customises category settings.
export const defaultCategoryColors: Record<string, string> = {
  Appearance: "#ec407a",
  Education: "#5c6bc0",
  Food: "#43a047",
  Health: "#26c6da",
  Household: "#f57c00",
  Housing: "#8d6e63",
  Lifestyle: "#ab47bc",
  "Professional Services": "#607d8b",
  [categoryRollupCategory]: "#7cb342",
  Transport: "#4285f4",
  Utilities: "#ffb300",
  [needsReviewCategory]: "#ef5350"
};
