import type { PeriodOption } from "@/lib/types";
import type { View } from "./types";

export const navItems: { label: string; view: View; icon: string }[] = [
  { label: "Home", view: "home", icon: "⌂" },
  { label: "Transactions", view: "transactions", icon: "≡" },
  { label: "Budgets", view: "budgets", icon: "◷" },
  { label: "Card fit", view: "cards", icon: "◇" },
  { label: "Connect", view: "connect", icon: "↗" },
  { label: "Settings", view: "settings", icon: "⚙" }
];

export const periods: PeriodOption[] = ["This month", "30 days", "90 days", "All"];

export const categoryOverridesStorageKey = "netly_category_overrides";

export const customCategoriesStorageKey = "netly_custom_categories";

export const deletedCategoriesStorageKey = "netly_deleted_categories";

export const categoryColorsStorageKey = "netly_category_colors";

export const defaultTransactionCategories = [
  "Groceries",
  "Eating out",
  "Transport",
  "Housing",
  "Utilities",
  "Shopping",
  "Health",
  "Lifestyle",
  "Education",
  "Entertainment",
  "Travel",
  "Fees",
  "Income",
  "Other",
  "Needs review"
];

export const netlyPalette = [
  "#ef5350", "#ec407a", "#ab47bc", "#7e57c2", "#5c6bc0",
  "#4285f4", "#039be5", "#26c6da", "#43a047", "#7cb342",
  "#c0ca33", "#ffb300", "#f57c00", "#8d6e63", "#607d8b"
];

export const defaultCategoryColors: Record<string, string> = {
  Shopping: "#ef5350",
  "Eating out": "#d84315",
  Housing: "#f57c00",
  Utilities: "#ffb300",
  Income: "#43a047",
  Groceries: "#26a69a",
  Health: "#00acc1",
  Transport: "#4285f4",
  Education: "#5e97f6",
  Travel: "#7e57c2",
  Lifestyle: "#ab47bc",
  Entertainment: "#ec407a",
  Other: "#8d6e63",
  Fees: "#78909c",
  "Needs review": "#607d8b"
};