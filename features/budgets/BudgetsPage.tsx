"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { InfoRow } from "@/components/ui/info-row";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle
} from "@/components/ui/drawer";
import { formatMoney } from "@/lib/insights";
import type { RecurringMerchant } from "@/lib/types";

type BudgetsPageProps = {
  categoryOptions: string[];
  categories: { category: string; amount: number }[];
  categoryColors: Record<string, string>;
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
};

type UserBudget = {
  categoryNames: string[];
  id: string;
  limit: number;
  name: string;
};

type BudgetFormState = {
  categoryNames: string[];
  limit: string;
  name: string;
};

type SavedBudgetState = {
  budgets: UserBudget[];
  hasStoredBudgets: boolean;
};

const budgetStorageKey = "netly_user_budgets";
const excludedDefaultBudgetCategories = new Set(["All categories", "Housing", "Income", "Needs review", "Transfers"]);
const collapsedBudgetLimit = 3;

// Budget screen with user-defined budgets calculated from selected categories.
export function BudgetsPage({ categoryOptions, categories, categoryColors, onRecurringClick, recurring }: BudgetsPageProps) {
  const [budgets, setBudgets] = useState<UserBudget[]>([]);
  const [editingBudget, setEditingBudget] = useState<UserBudget | null>(null);
  const [budgetStorageError, setBudgetStorageError] = useState("");
  const [hasStoredBudgets, setHasStoredBudgets] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBudgetListExpanded, setIsBudgetListExpanded] = useState(false);
  const [form, setForm] = useState<BudgetFormState>(() => getEmptyBudgetForm([]));
  const renderedBudgets = useMemo(
    () => getRenderableBudgets(budgets, categories, categoryOptions, hasStoredBudgets),
    [budgets, categories, categoryOptions, hasStoredBudgets]
  );
  const visibleBudgets = isBudgetListExpanded ? renderedBudgets : renderedBudgets.slice(0, collapsedBudgetLimit);
  const hiddenBudgetCount = Math.max(0, renderedBudgets.length - visibleBudgets.length);
  const categoryTotals = useMemo(() => new Map(categories.map((item) => [item.category, item.amount])), [categories]);
  const availableCategoryOptions = useMemo(() => getAvailableCategoryOptions(categoryOptions, categories), [categoryOptions, categories]);
  const activeBudget = editingBudget || null;
  const formLimit = Number.parseFloat(form.limit);
  const canSaveBudget = form.name.trim().length > 0 && Number.isFinite(formLimit) && formLimit > 0 && form.categoryNames.length > 0;

  useEffect(() => {
    const savedBudgetState = readSavedBudgetState();

    setBudgets(savedBudgetState.budgets);
    setHasStoredBudgets(savedBudgetState.hasStoredBudgets);
  }, []);

  const openNewBudget = () => {
    setEditingBudget(null);
    setForm(getEmptyBudgetForm(availableCategoryOptions));
    setIsEditorOpen(true);
  };
  const openBudgetEditor = (budget: UserBudget) => {
    setEditingBudget(budget);
    setForm({
      categoryNames: budget.categoryNames,
      limit: String(budget.limit),
      name: budget.name
    });
    setIsEditorOpen(true);
  };
  const saveBudget = () => {
    if (!canSaveBudget) {
      return;
    }

    const nextBudget: UserBudget = {
      categoryNames: form.categoryNames,
      id: activeBudget?.id || createBudgetId(),
      limit: formLimit,
      name: form.name.trim()
    };
    const shouldReplaceBudget = activeBudget && budgets.some((budget) => budget.id === activeBudget.id);
    const nextBudgets = shouldReplaceBudget
      ? budgets.map((budget) => budget.id === activeBudget.id ? nextBudget : budget)
      : [...budgets, nextBudget];

    setIsEditorOpen(false);
    setBudgetsAndPersist(nextBudgets, setBudgets, setHasStoredBudgets, setBudgetStorageError);
  };
  const submitBudgetForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    saveBudget();
  };
  const deleteBudget = () => {
    if (!activeBudget) {
      return;
    }

    setBudgetsAndPersist(budgets.filter((budget) => budget.id !== activeBudget.id), setBudgets, setHasStoredBudgets, setBudgetStorageError);
    setIsEditorOpen(false);
  };
  const resetBudgets = () => restoreDefaultBudgets(setBudgets, setHasStoredBudgets, setBudgetStorageError);

  return (
    <section className="view-stack budget-page-layout" data-testid="budgets-page">
      <div className="budget-desktop-grid">
        <section className="budget-builder">
          <div className="budget-builder-header">
            <div>
              <h2>Budgets</h2>
              <p>Track spending limits from the categories you choose.</p>
            </div>
            {hasStoredBudgets && (
              <button className="budget-reset-button" onClick={resetBudgets} type="button">
                <RotateCcw aria-hidden="true" size={16} strokeWidth={2.4} />
                Reset
              </button>
            )}
          </div>
          <div className="budget-card-list">
            {visibleBudgets.map((budget) => (
              <BudgetCard
                budget={budget}
                categoryColors={categoryColors}
                key={budget.id}
                onEdit={() => openBudgetEditor(budget)}
                spent={getBudgetSpend(categoryTotals, budget.categoryNames)}
              />
            ))}
            {hiddenBudgetCount > 0 && (
              <button className="budget-more-card" onClick={() => setIsBudgetListExpanded(true)} type="button">
                + {hiddenBudgetCount} more
              </button>
            )}
            {isBudgetListExpanded && renderedBudgets.length > collapsedBudgetLimit && (
              <button className="budget-less-card" onClick={() => setIsBudgetListExpanded(false)} type="button">
                Show less
              </button>
            )}
            <button className="budget-add-card" onClick={openNewBudget} type="button">
              <Plus aria-hidden="true" size={28} strokeWidth={2.1} />
              <span>Add budget</span>
            </button>
          </div>
          <Button className="budget-fab" onClick={openNewBudget} type="button" aria-label="Add budget">
            <Plus aria-hidden="true" size={28} strokeWidth={2.4} />
          </Button>
        </section>

        <section className="material-card budget-recurring-panel">
          <PanelTitle title="Recurring payments" subtitle="Repeated merchants and average amounts" />
          <div className="stack-list mt-[18px]">
            {recurring.length > 0 ? (
              recurring.map((item) => (
                <InfoRow
                  color={categoryColors[item.category] || "#607d8b"}
                  key={item.merchant}
                  meta={getRecurringMeta(item)}
                  onClick={() => onRecurringClick(item.merchant)}
                  title={item.merchant}
                  value={formatMoney(item.average, true)}
                />
              ))
            ) : (
              <div className="empty-state">No repeated merchants found in the last 90 days.</div>
            )}
          </div>
        </section>
      </div>
      {budgetStorageError && <p className="budget-storage-error">{budgetStorageError}</p>}

      <BudgetEditor
        availableCategoryOptions={availableCategoryOptions}
        canSaveBudget={canSaveBudget}
        editingBudget={editingBudget}
        form={form}
        onDelete={deleteBudget}
        onFormChange={setForm}
        onOpenChange={setIsEditorOpen}
        onSave={saveBudget}
        onSubmit={submitBudgetForm}
        open={isEditorOpen}
      />
    </section>
  );
}

// Individual user budget with category-based spend progress.
function BudgetCard({
  budget,
  categoryColors,
  onEdit,
  spent
}: {
  budget: UserBudget;
  categoryColors: Record<string, string>;
  onEdit: () => void;
  spent: number;
}) {
  const left = Math.max(0, budget.limit - spent);
  const progress = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0;
  const monthPeriod = getCurrentMonthPeriod();
  const todayProgress = getMonthProgress();
  const daysLeft = getDaysLeftInMonth();
  const dailyAmount = getDailyAmount(left, daysLeft);

  return (
    <article className="budget-progress-card">
      <div className="budget-progress-top">
        <div>
          <strong>{budget.name}</strong>
          <p>
            <b>{formatMoney(left, true)}</b> left of {formatMoney(budget.limit, true)}
          </p>
        </div>
        <button aria-label={`Edit ${budget.name}`} onClick={onEdit} type="button">
          <Pencil aria-hidden="true" size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="budget-progress-body">
        <div className="budget-period-row">
          <span>{monthPeriod.startLabel}</span>
          <div className="budget-progress-track">
            <span className="budget-progress-fill" style={{ width: `${progress}%` }}>
              <strong>{Math.round(progress)}%</strong>
            </span>
            <span className="budget-today-marker" style={{ left: `${todayProgress}%` }}>
              <small>Today</small>
            </span>
          </div>
          <span>{monthPeriod.endLabel}</span>
        </div>
        <p className="budget-daily-note">
          {left > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : "Budget fully used for this period"}
        </p>
        <div className="budget-category-pills">
          {budget.categoryNames.map((category) => (
            <span key={category}>
              <i style={{ background: categoryColors[category] || "#607d8b" }} />
              {category}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

// Drawer form for setting the amount and included progress categories.
function BudgetEditor({
  availableCategoryOptions,
  canSaveBudget,
  editingBudget,
  form,
  onDelete,
  onFormChange,
  onOpenChange,
  onSave,
  onSubmit,
  open
}: {
  availableCategoryOptions: string[];
  canSaveBudget: boolean;
  editingBudget: UserBudget | null;
  form: BudgetFormState;
  onDelete: () => void;
  onFormChange: (form: BudgetFormState) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  open: boolean;
}) {
  const changeName = (event: ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, name: event.target.value });
  const changeLimit = (event: ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, limit: event.target.value });
  const toggleCategory = (category: string) => {
    const nextCategories = form.categoryNames.includes(category)
      ? form.categoryNames.filter((item) => item !== category)
      : [...form.categoryNames, category];

    onFormChange({
      ...form,
      categoryNames: nextCategories
    });
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="budget-editor-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>{editingBudget ? "Edit budget" : "New budget"}</DrawerTitle>
          <DrawerDescription className="sr-only">Set a budget amount and choose categories that count toward progress.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        <form className="budget-editor-form" onSubmit={onSubmit}>
          <label>
            Budget name
            <input autoComplete="off" onChange={changeName} placeholder="Spending money" value={form.name} />
          </label>
          <label>
            Amount
            <input inputMode="decimal" min="0" onChange={changeLimit} placeholder="800" step="0.01" type="number" value={form.limit} />
          </label>
          <section className="budget-category-selector">
            <h3>Categories that count as progress</h3>
            <div>
              {availableCategoryOptions.map((category) => (
                <button
                  aria-pressed={form.categoryNames.includes(category)}
                  className={form.categoryNames.includes(category) ? "active" : undefined}
                  key={category}
                  onClick={() => toggleCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              ))}
            </div>
          </section>
          <div className="budget-editor-actions">
            {editingBudget && (
              <Button className="budget-delete-button" onClick={onDelete} type="button" variant="outline">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Delete
              </Button>
            )}
            <button className="budget-save-button" disabled={!canSaveBudget} onClick={onSave} type="button">
              Save budget
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

// Summarizes the recurring merchant evidence for a row.
function getRecurringMeta(item: RecurringMerchant) {
  return `${item.category} · ${item.count} payments detected over 90 days`;
}

// Sums spend for the categories selected on a budget.
function getBudgetSpend(categoryTotals: Map<string, number>, categoryNames: string[]) {
  return categoryNames.reduce((total, category) => total + (categoryTotals.get(category) || 0), 0);
}

// Supplies the starter budget until the user saves their own budget state.
function getRenderableBudgets(budgets: UserBudget[], categories: { category: string; amount: number }[], categoryOptions: string[], hasStoredBudgets: boolean) {
  if (hasStoredBudgets || budgets.length > 0) {
    return budgets;
  }

  const defaultCategories = getDefaultBudgetCategories(getAvailableCategoryOptions(categoryOptions, categories));

  return [
    {
      categoryNames: defaultCategories,
      id: "default-spending-money",
      limit: 800,
      name: "Spending money"
    }
  ];
}

// Builds a unique, sorted list of spend categories that can count toward progress.
function getAvailableCategoryOptions(categoryOptions: string[], categories: { category: string; amount: number }[]) {
  const allCategories = new Set([
    ...categoryOptions.filter((category) => category !== "All categories"),
    ...categories.map((item) => item.category)
  ]);

  return [...allCategories].sort((first, second) => first.localeCompare(second));
}

// Picks sensible expense-like categories for the starter budget.
function getDefaultBudgetCategories(categoryOptions: string[]) {
  const defaultCategories = categoryOptions.filter((category) => !excludedDefaultBudgetCategories.has(category));

  if (defaultCategories.length > 0) {
    return defaultCategories;
  }

  return categoryOptions.slice(0, 4);
}

// Creates the form state used for a new or starter budget.
function getEmptyBudgetForm(categoryOptions: string[]): BudgetFormState {
  return {
    categoryNames: getDefaultBudgetCategories(categoryOptions),
    limit: "800",
    name: "Spending money"
  };
}

// Reads persisted budgets and distinguishes "never saved" from "saved empty".
function readSavedBudgetState(): SavedBudgetState {
  const storage = getBudgetStorage();
  const storedBudgets = storage?.getItem(budgetStorageKey);

  if (!storedBudgets) {
    return {
      budgets: [],
      hasStoredBudgets: false
    };
  }

  return {
    budgets: parseSavedBudgets(storedBudgets),
    hasStoredBudgets: true
  };
}

// Parses the persisted local budget array and fails loudly on corrupt data.
function parseSavedBudgets(value: string): UserBudget[] {
  const parsedValue = JSON.parse(value) as unknown;

  if (!Array.isArray(parsedValue)) {
    throw new Error("Invalid saved budgets: expected an array.");
  }

  return parsedValue.map(parseSavedBudget);
}

// Validates one persisted budget before returning it to the UI.
function parseSavedBudget(value: unknown): UserBudget {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.limit !== "number" || !Array.isArray(value.categoryNames)) {
    throw new Error("Invalid saved budget: expected id, name, numeric limit, and categoryNames.");
  }

  const categoryNames = value.categoryNames.map((category) => {
    if (typeof category !== "string") {
      throw new Error("Invalid saved budget category: expected a string.");
    }

    return category;
  });

  return {
    categoryNames,
    id: value.id,
    limit: value.limit,
    name: value.name
  };
}

// Stores the complete custom budget list in localStorage.
function setBudgetsAndPersist(
  budgets: UserBudget[],
  setBudgets: (budgets: UserBudget[]) => void,
  setHasStoredBudgets: (hasStoredBudgets: boolean) => void,
  setBudgetStorageError: (message: string) => void
) {
  setBudgets(budgets);
  setHasStoredBudgets(true);
  persistBudgetStorage(budgets, setBudgetStorageError);
}

// Clears local custom budgets so the starter budget is shown again.
function restoreDefaultBudgets(
  setBudgets: (budgets: UserBudget[]) => void,
  setHasStoredBudgets: (hasStoredBudgets: boolean) => void,
  setBudgetStorageError: (message: string) => void
) {
  setBudgets([]);
  setHasStoredBudgets(false);
  setBudgetStorageError("");
  getBudgetStorage()?.removeItem(budgetStorageKey);
}

// Persists budgets when browser storage is available and reports when it is not.
function persistBudgetStorage(budgets: UserBudget[], setBudgetStorageError: (message: string) => void) {
  const storage = getBudgetStorage();

  if (!storage) {
    setBudgetStorageError("Budget changes are saved for this session only because browser storage is unavailable.");
    return;
  }

  try {
    storage.setItem(budgetStorageKey, JSON.stringify(budgets));
    setBudgetStorageError("");
  } catch {
    setBudgetStorageError("Budget changes are saved for this session only because browser storage could not be written.");
  }
}

// Reads localStorage only when the browser exposes it.
function getBudgetStorage() {
  try {
    return typeof window.localStorage === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// Creates a stable local id without requiring browser crypto support.
function createBudgetId() {
  return `budget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Calculates where today sits in the current calendar month.
function getMonthProgress() {
  const today = new Date();
  const daysInMonth = getDaysInMonth(today);

  return Math.min(100, Math.max(0, ((today.getDate() - 1) / Math.max(1, daysInMonth - 1)) * 100));
}

// Returns display labels for the active monthly budget period.
function getCurrentMonthPeriod() {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    endLabel: formatPeriodDate(endDate),
    startLabel: formatPeriodDate(startDate)
  };
}

// Formats compact local month/day labels for the budget timeline.
function formatPeriodDate(date: Date) {
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short"
  });
}

// Counts remaining days in the current month, keeping today actionable.
function getDaysLeftInMonth() {
  const today = new Date();
  return Math.max(1, getDaysInMonth(today) - today.getDate());
}

// Returns the number of days in the month for a date.
function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

// Converts the remaining budget into a daily allowance.
function getDailyAmount(left: number, daysLeft: number) {
  return left / daysLeft;
}

// Narrows unknown persisted JSON before field validation.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
