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

export const categoryRulesStorageKey = "netly_category_learning_rules";

export const categorySettingsVersionStorageKey = "netly_category_settings_version";

export const categorySettingsVersion = "2";

export const customCategoriesStorageKey = "netly_custom_categories";

export const deletedCategoriesStorageKey = "netly_deleted_categories";

export const categoryColorsStorageKey = "netly_category_colors";

export const dashboardPeriodStorageKey = "netly_dashboard_period";

export const cardFitIncludedCategoriesStorageKey = "netly_card_fit_included_categories";

export const hideBalancesStorageKey = "netly_hide_balances";

export const defaultAccountStorageKey = "netly_default_account_id";

export const incomeIncludedCategoriesStorageKey = "netly_income_included_categories";

export const incomeExcludedCategoriesStorageKey = "netly_income_excluded_categories";

export const paydayStorageKey = "netly_payday";

export const budgetsStorageKey = "netly_user_budgets";
