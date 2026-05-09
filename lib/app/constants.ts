import type { PeriodOption } from "@/lib/types";
import type { PaymentTestForm, View } from "./types";

export const navItems: { label: string; view: View; icon: string }[] = [
  { label: "Home", view: "home", icon: "⌂" },
  { label: "Transactions", view: "transactions", icon: "≡" },
  { label: "Budgets", view: "budgets", icon: "◷" },
  { label: "Card fit", view: "cards", icon: "◇" },
  { label: "Connect", view: "connect", icon: "↗" },
  { label: "Settings", view: "settings", icon: "⚙" }
];

export const periods: PeriodOption[] = ["This month", "30 days", "90 days", "All"];

export const bankReferenceMaxLength = 12;

export const paymentTestBaselineStorageKey = "moneyfit_payment_test_baseline";

export const paymentTestResultStorageKey = "moneyfit_payment_test_result";

export const categoryOverridesStorageKey = "moneyfit_category_overrides";

export const customCategoriesStorageKey = "moneyfit_custom_categories";

export const deletedCategoriesStorageKey = "moneyfit_deleted_categories";

export const categoryColorsStorageKey = "moneyfit_category_colors";

export const defaultTransactionCategories = [
  "Groceries",
  "Eating out",
  "Transport",
  "Fuel",
  "Housing",
  "Utilities",
  "Bills",
  "Shopping",
  "Subscriptions",
  "Health",
  "Lifestyle",
  "Insurance",
  "Education",
  "Entertainment",
  "Travel",
  "Transfers",
  "Fees",
  "Income",
  "Needs review"
];

export const moneyfitPalette = [
  "#ef5350", "#d84315", "#f57c00", "#ffb300", "#43a047",
  "#26a69a", "#00a693", "#4285f4", "#5e97f6", "#7e57c2",
  "#ab47bc", "#ec407a", "#8d6e63", "#78909c", "#607d8b"
];

export const defaultCategoryColors: Record<string, string> = {
  Groceries: "#00a693",
  "Eating out": "#f57c00",
  Transport: "#4285f4",
  Fuel: "#5e97f6",
  Subscriptions: "#ab47bc",
  Utilities: "#ffb300",
  Bills: "#ffb300",
  Housing: "#78909c",
  Shopping: "#ef5350",
  Health: "#26a69a",
  Lifestyle: "#d84315",
  Insurance: "#7e57c2",
  Education: "#43a047",
  Income: "#43a047",
  Travel: "#7e57c2",
  Entertainment: "#ec407a",
  Transfers: "#8d6e63",
  Fees: "#d84315",
  "Needs review": "#607d8b"
};

export const defaultPaymentTestForm: PaymentTestForm = {
  amount: "1.00",
  creditorAccount: "99-2385-6710320-00",
  creditorName: "MoneyFit Test Payee",
  reference: "MF test",
  particulars: "MoneyFit",
  code: "TEST"
};
