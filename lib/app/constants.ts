import type { PeriodOption } from "@/lib/types";
import type { PaymentTestForm, View } from "./types";

export const navItems: { label: string; view: View; icon: string }[] = [
  { label: "Home", view: "home", icon: "⌂" },
  { label: "Transactions", view: "transactions", icon: "≡" },
  { label: "Budgets", view: "budgets", icon: "◷" },
  { label: "Card fit", view: "cards", icon: "◇" },
  { label: "Payment test", view: "payment", icon: "$" },
  { label: "Connect", view: "connect", icon: "↗" }
];

export const periods: PeriodOption[] = ["This month", "30 days", "90 days", "All"];

export const bankReferenceMaxLength = 12;

export const paymentTestBaselineStorageKey = "moneyfit_payment_test_baseline";

export const paymentTestResultStorageKey = "moneyfit_payment_test_result";

export const categoryOverridesStorageKey = "moneyfit_category_overrides";

export const customCategoriesStorageKey = "moneyfit_custom_categories";

export const defaultTransactionCategories = [
  "Groceries",
  "Eating out",
  "Transport",
  "Fuel",
  "Housing",
  "Utilities",
  "Shopping",
  "Subscriptions",
  "Health",
  "Insurance",
  "Education",
  "Entertainment",
  "Travel",
  "Transfers",
  "Fees",
  "Income",
  "Needs review"
];

export const defaultPaymentTestForm: PaymentTestForm = {
  amount: "1.00",
  creditorAccount: "99-2385-6710320-00",
  creditorName: "MoneyFit Test Payee",
  reference: "MF test",
  particulars: "MoneyFit",
  code: "TEST"
};
