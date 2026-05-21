"use client";

import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { budgetsStorageKey } from "@/lib/app/constants";
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

const collapsedBudgetLimit = 3;

// Budget screen with user-defined budgets calculated from selected categories.
export function BudgetsPage({ categoryOptions, categories, categoryColors, onRecurringClick, recurring }: BudgetsPageProps) {
  const [budgets, setBudgets] = useState<UserBudget[]>([]);
  const [editingBudget, setEditingBudget] = useState<UserBudget | null>(null);
  const [budgetStorageError, setBudgetStorageError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBudgetListExpanded, setIsBudgetListExpanded] = useState(false);
  const [form, setForm] = useState<BudgetFormState>(getEmptyBudgetForm);
  const renderedBudgets = useMemo(
    () => getRenderableBudgets(budgets),
    [budgets]
  );
  const visibleBudgets = isBudgetListExpanded ? renderedBudgets : renderedBudgets.slice(0, collapsedBudgetLimit);
  const hiddenBudgetCount = Math.max(0, renderedBudgets.length - visibleBudgets.length);
  const categoryTotals = useMemo(() => new Map(categories.map((item) => [item.category, item.amount])), [categories]);
  const availableCategoryOptions = useMemo(() => getAvailableCategoryOptions(categoryOptions, categories), [categoryOptions, categories]);
  const activeBudget = editingBudget || null;
  const formLimit = Number.parseFloat(form.limit);
  const canSaveBudget = form.name.trim().length > 0 && Number.isFinite(formLimit) && formLimit > 0 && form.categoryNames.length > 0;

  useEffect(() => {
    setBudgets(readSavedBudgets());
  }, []);

  const openNewBudget = () => {
    setEditingBudget(null);
    setForm(getEmptyBudgetForm());
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
    setBudgetsAndPersist(nextBudgets, setBudgets, setBudgetStorageError);
  };
  const submitBudgetForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    saveBudget();
  };
  const deleteBudget = () => {
    if (!activeBudget) {
      return;
    }

    setBudgetsAndPersist(budgets.filter((budget) => budget.id !== activeBudget.id), setBudgets, setBudgetStorageError);
    setIsEditorOpen(false);
  };

  return (
    <section className="view-stack budget-page-layout" data-testid="budgets-page">
      <MobilePageHeader title="Budgets" />
      <div className="budget-desktop-grid">
        <section className="budget-builder">
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
            {visibleBudgets.length === 0 && (
              <div className="budget-empty-state">
                <strong>No budgets yet</strong>
                <span>Add a monthly budget and choose the categories that count toward it.</span>
              </div>
            )}
            <button className="budget-add-card" onClick={openNewBudget} type="button">
              <Plus aria-hidden="true" size={28} strokeWidth={2.1} />
              <span>Add budget</span>
            </button>
          </div>
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
  const remaining = budget.limit - spent;
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const progressWidth = Math.min(100, Math.max(0, progress));
  const budgetStatusLabel = remaining >= 0
    ? `${formatMoney(remaining, true)} left of ${formatMoney(budget.limit, true)}`
    : `${formatMoney(Math.abs(remaining), true)} over of ${formatMoney(budget.limit, true)}`;
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
            <b>{budgetStatusLabel}</b>
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
            <span className="budget-progress-fill" style={{ width: `${progressWidth}%` }}>
              <strong>{Math.round(progress)}%</strong>
            </span>
            <span className="budget-today-marker" style={{ left: `${todayProgress}%` }}>
              <small>Today</small>
            </span>
          </div>
          <span>{monthPeriod.endLabel}</span>
        </div>
        <p className="budget-daily-note">
          {remaining > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : `${formatMoney(Math.abs(remaining), true)} over this month`}
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
  const isMobileEditor = useBudgetMobileEditor();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const changeName = (event: ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, name: event.target.value });
  const changeLimit = (event: ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, limit: event.target.value });
  const selectAllCategories = () => onFormChange({ ...form, categoryNames: availableCategoryOptions });
  const clearCategories = () => onFormChange({ ...form, categoryNames: [] });
  const toggleCategory = (category: string) => {
    const nextCategories = form.categoryNames.includes(category)
      ? form.categoryNames.filter((item) => item !== category)
      : [...form.categoryNames, category];

    onFormChange({
      ...form,
      categoryNames: nextCategories
    });
  };
  const focusTitleOnOpen = (event: Event) => {
    event.preventDefault();
    titleRef.current?.focus();
  };

  const formContent = (
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
        <div className="budget-category-selector-heading">
          <h3>Categories that count as progress</h3>
          <div>
            <Button onClick={selectAllCategories} size="sm" type="button" variant="outline">
              Select all
            </Button>
            <Button onClick={clearCategories} size="sm" type="button" variant="outline">
              Clear
            </Button>
          </div>
        </div>
        <div className="budget-category-selector-options">
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
  );

  if (!isMobileEditor) {
    return (
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent
          className="transaction-details-shell w-[min(560px,calc(100vw-36px))] overflow-hidden p-0"
          overlayClassName="transaction-details-overlay"
          onOpenAutoFocus={focusTitleOnOpen}
        >
          <div className="transaction-details-sheet budget-editor-sheet flex h-full flex-col overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="focus:outline-none" ref={titleRef} tabIndex={-1}>{editingBudget ? "Edit budget" : "New budget"}</SheetTitle>
              <SheetDescription>Set a monthly budget amount and choose categories that count toward progress.</SheetDescription>
            </SheetHeader>
            {formContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="budget-editor-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>{editingBudget ? "Edit budget" : "New budget"}</DrawerTitle>
          <DrawerDescription className="sr-only">Set a budget amount and choose categories that count toward progress.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        {formContent}
      </DrawerContent>
    </Drawer>
  );
}

// Uses a true mobile cutoff so narrow desktop windows still get a side sheet.
function useBudgetMobileEditor() {
  const [isMobileEditor, setIsMobileEditor] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateEditorMode = () => setIsMobileEditor(media.matches);

    updateEditorMode();
    media.addEventListener("change", updateEditorMode);

    return () => {
      media.removeEventListener("change", updateEditorMode);
    };
  }, []);

  return isMobileEditor;
}

// Summarizes the recurring merchant evidence for a row.
function getRecurringMeta(item: RecurringMerchant) {
  return `${item.category} · ${item.count} payments detected over 90 days`;
}

// Sums spend for the categories selected on a budget.
function getBudgetSpend(categoryTotals: Map<string, number>, categoryNames: string[]) {
  return categoryNames.reduce((total, category) => total + (categoryTotals.get(category) || 0), 0);
}

// Returns the user-created budget list without adding starter defaults.
function getRenderableBudgets(budgets: UserBudget[]) {
  return budgets;
}

// Builds a unique, sorted list of spend categories that can count toward progress.
function getAvailableCategoryOptions(categoryOptions: string[], categories: { category: string; amount: number }[]) {
  const allCategories = new Set([
    ...categoryOptions.filter((category) => category !== "All categories"),
    ...categories.map((item) => item.category)
  ]);

  return [...allCategories].sort((first, second) => first.localeCompare(second));
}

// Creates the form state used for a new monthly budget.
function getEmptyBudgetForm(): BudgetFormState {
  return {
    categoryNames: [],
    limit: "800",
    name: "Spending money"
  };
}

// Reads persisted budgets, using an empty list when no budget has been saved.
function readSavedBudgets() {
  const storage = getBudgetStorage();
  const storedBudgets = storage?.getItem(budgetsStorageKey);

  if (!storedBudgets) {
    return [];
  }

  return parseSavedBudgets(storedBudgets);
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
  setBudgetStorageError: (message: string) => void
) {
  setBudgets(budgets);
  persistBudgetStorage(budgets, setBudgetStorageError);
}

// Persists budgets when browser storage is available and reports when it is not.
function persistBudgetStorage(budgets: UserBudget[], setBudgetStorageError: (message: string) => void) {
  const storage = getBudgetStorage();

  if (!storage) {
    setBudgetStorageError("Budget changes are saved for this session only because browser storage is unavailable.");
    return;
  }

  try {
    storage.setItem(budgetsStorageKey, JSON.stringify(budgets));
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
