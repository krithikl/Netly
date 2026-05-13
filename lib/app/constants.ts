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

export const dashboardPeriodStorageKey = "netly_dashboard_period";
