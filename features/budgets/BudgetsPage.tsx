"use client";

import { type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { InfoRow } from "@/components/ui/info-row";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { DonutChart } from "@/components/ui/donut-chart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { TransactionList } from "@/features/transactions/TransactionList";
import type { SelectOption } from "@/components/ui/select-field";
import { useCloseOnPageScroll } from "@/hooks/useCloseOnPageScroll";
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
import { formatMoney, spendByCategory } from "@/lib/insights";
import { cn } from "@/lib/utils";
import type { CategoryEditScope } from "@/lib/category-rules";
import type { RecurringMerchant, Transaction } from "@/lib/types";
import {
  getBudgetCategoryBreakdown,
  getBudgetChartCategories,
  getBudgetDaysLeft,
  getBudgetPeriod,
  getBudgetPeriodProgress,
  getBudgetPeriodTransactions,
  getBudgetSpendFromBreakdown,
  type BudgetCadence,
  type BudgetCategoryBreakdown
} from "@/features/budgets/budgetLogic";

type BudgetsPageProps = {
  categoryOptions: string[];
  categoryColors: Record<string, string>;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
  transactions: Transaction[];
};

type UserBudget = {
  categoryNames: string[];
  cadence: BudgetCadence;
  id: string;
  limit: number;
  name: string;
  periodAnchorDate: string;
};

type BudgetFormState = {
  categoryNames: string[];
  cadence: BudgetCadence;
  limit: string;
  name: string;
};

const collapsedBudgetLimit = 3;
const budgetCadenceOptions: Array<{ label: string; value: BudgetCadence }> = [
  { label: "Weekly", value: "weekly" },
  { label: "Fortnightly", value: "fortnightly" },
  { label: "Monthly", value: "monthly" }
];
const defaultBudgetCadence: BudgetCadence = "monthly";
const budgetListToggleButtonClassName = "grid min-h-full cursor-pointer place-items-center rounded-[22px] border border-[var(--outline-soft)] bg-[var(--surface-2)] font-[inherit] text-[1.05rem] font-black text-[var(--accent-cream)] hover:border-[var(--primary-border)] hover:bg-[var(--surface-3)] max-[768px]:min-h-[60px] max-[768px]:rounded-[20px] max-[768px]:text-base";
const budgetEditorLabelClassName = "grid gap-[7px] text-[11px] font-[850] uppercase tracking-[0.04em] text-[var(--muted)]";
const budgetEditorInputClassName = "min-h-11 w-full rounded-xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3 py-2.5 text-[0.95rem] font-bold text-[var(--ink)] outline-none focus:border-[var(--primary-border)]";

// Budget screen with user-defined budgets calculated from selected categories.
export function BudgetsPage({ categoryOptions, categoryColors, onCategoryChange, onRecurringClick, recurring, transactions }: BudgetsPageProps) {
  const [budgets, setBudgets] = useState<UserBudget[]>([]);
  const [editingBudget, setEditingBudget] = useState<UserBudget | null>(null);
  const [budgetStorageError, setBudgetStorageError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBudgetListExpanded, setIsBudgetListExpanded] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetFormState>(getEmptyBudgetForm);
  const renderedBudgets = useMemo(
    () => getRenderableBudgets(budgets),
    [budgets]
  );
  const visibleBudgets = isBudgetListExpanded ? renderedBudgets : renderedBudgets.slice(0, collapsedBudgetLimit);
  const hiddenBudgetCount = Math.max(0, renderedBudgets.length - visibleBudgets.length);
  const categories = useMemo(() => spendByCategory(transactions), [transactions]);
  const availableCategoryOptions = useMemo(() => getAvailableCategoryOptions(categoryOptions, categories), [categoryOptions, categories]);
  const editableCategorySelectOptions = useMemo(() => getSelectOptions(categoryOptions.filter((category) => category !== "All categories")), [categoryOptions]);
  const selectedBudget = useMemo(() => renderedBudgets.find((budget) => budget.id === selectedBudgetId) || null, [renderedBudgets, selectedBudgetId]);
  const selectedBudgetBreakdown = useMemo(
    () => selectedBudget
      ? getBudgetCategoryBreakdown(
          getBudgetPeriodTransactions(transactions, selectedBudget.cadence, selectedBudget.periodAnchorDate),
          selectedBudget.categoryNames
        )
      : [],
    [selectedBudget, transactions]
  );
  const activeBudget = editingBudget || null;
  const formLimit = Number.parseFloat(form.limit);
  const canSaveBudget = form.name.trim().length > 0 && Number.isFinite(formLimit) && formLimit > 0 && form.categoryNames.length > 0;

  useEffect(() => {
    setBudgets(readSavedBudgets());
  }, []);

  useEffect(() => {
    if (selectedBudgetId && !selectedBudget) {
      setSelectedBudgetId(null);
    }
  }, [selectedBudget, selectedBudgetId]);

  const openNewBudget = () => {
    setEditingBudget(null);
    setForm(getEmptyBudgetForm());
    setIsEditorOpen(true);
  };
  const openBudgetEditor = (budget: UserBudget) => {
    setEditingBudget(budget);
    setForm({
      categoryNames: budget.categoryNames,
      cadence: budget.cadence,
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
      cadence: form.cadence,
      id: activeBudget?.id || createBudgetId(),
      limit: formLimit,
      name: form.name.trim(),
      periodAnchorDate: getNextBudgetAnchorDate(activeBudget, form.cadence)
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
    setSelectedBudgetId((currentId) => currentId === activeBudget.id ? null : currentId);
    setIsEditorOpen(false);
  };

  if (selectedBudget) {
    return (
      <section className="view-stack budget-page-layout" data-testid="budget-detail-page">
        <BudgetDetailView
          breakdown={selectedBudgetBreakdown}
          budget={selectedBudget}
          categoryColors={categoryColors}
          categorySelectOptions={editableCategorySelectOptions}
          onBack={() => setSelectedBudgetId(null)}
          onCategoryChange={onCategoryChange}
          onEdit={() => openBudgetEditor(selectedBudget)}
        />
        {budgetStorageError && (
          <p className="rounded-[14px] border border-[rgba(229,184,107,0.28)] bg-[rgba(229,184,107,0.1)] px-3 py-2.5 text-[13px] font-bold text-[var(--warning)]">
            {budgetStorageError}
          </p>
        )}
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

  return (
    <section className="view-stack budget-page-layout" data-testid="budgets-page">
      <MobilePageHeader title="Budgets" />
      <div className="budget-desktop-grid">
        <section className="relative grid min-w-0 gap-[18px] max-[768px]:gap-3.5">
          <div className="budget-card-grid">
            {visibleBudgets.map((budget) => (
              <BudgetCard
                budget={budget}
                key={budget.id}
                onEdit={() => openBudgetEditor(budget)}
                onOpen={() => setSelectedBudgetId(budget.id)}
                spent={getBudgetSpendFromBreakdown(getBudgetCategoryBreakdown(
                  getBudgetPeriodTransactions(transactions, budget.cadence, budget.periodAnchorDate),
                  budget.categoryNames
                ))}
              />
            ))}
            {hiddenBudgetCount > 0 && (
              <button className={budgetListToggleButtonClassName} onClick={() => setIsBudgetListExpanded(true)} type="button">
                + {hiddenBudgetCount} more
              </button>
            )}
            {isBudgetListExpanded && renderedBudgets.length > collapsedBudgetLimit && (
              <button className={budgetListToggleButtonClassName} onClick={() => setIsBudgetListExpanded(false)} type="button">
                Show less
              </button>
            )}
            {visibleBudgets.length === 0 && (
              <div className="grid min-h-[170px] content-center gap-2 rounded-[28px] border border-dashed border-[var(--outline-soft)] bg-[var(--surface-2)] p-[18px] text-[var(--muted)]">
                <strong className="text-base font-black text-[var(--ink)]">No budgets yet</strong>
                <span className="text-[0.86rem] font-bold leading-[1.4]">Add a budget period and choose the categories that count toward it.</span>
              </div>
            )}
            <button className="grid min-h-full cursor-pointer place-items-center gap-2.5 rounded-[28px] border-2 border-[var(--outline-soft)] bg-transparent font-[inherit] text-[0.95rem] font-[850] text-[var(--muted-2)] transition-[border-color,color,background,transform] duration-[var(--motion-fast)] ease-[var(--motion-ease)] animate-[card-in_var(--motion-medium)_var(--motion-ease)_both] hover:-translate-y-px hover:border-[var(--primary-border)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--accent-cream)] focus-visible:-translate-y-px focus-visible:border-[var(--primary-border)] focus-visible:bg-[rgba(255,255,255,0.03)] focus-visible:text-[var(--accent-cream)] max-[768px]:min-h-[170px]" onClick={openNewBudget} type="button">
              <Plus aria-hidden="true" className="self-end" size={28} strokeWidth={2.1} />
              <span className="self-start">Add budget</span>
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
      {budgetStorageError && (
        <p className="rounded-[14px] border border-[rgba(229,184,107,0.28)] bg-[rgba(229,184,107,0.1)] px-3 py-2.5 text-[13px] font-bold text-[var(--warning)]">
          {budgetStorageError}
        </p>
      )}

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
  onEdit,
  onOpen,
  spent
}: {
  budget: UserBudget;
  onEdit: () => void;
  onOpen: () => void;
  spent: number;
}) {
  const left = Math.max(0, budget.limit - spent);
  const remaining = budget.limit - spent;
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const budgetStatusLabel = remaining >= 0
    ? `${formatMoney(remaining, true)} left of ${formatMoney(budget.limit, true)}`
    : `${formatMoney(Math.abs(remaining), true)} over of ${formatMoney(budget.limit, true)}`;
  const budgetPeriod = getBudgetPeriod(budget.cadence, budget.periodAnchorDate);
  const daysLeft = getBudgetDaysLeft(budgetPeriod);
  const dailyAmount = getDailyAmount(left, daysLeft);
  const openOnKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onOpen();
  };
  const editBudget = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onEdit();
  };

  return (
    <article className="budget-progress-card clickable" onClick={onOpen} onKeyDown={openOnKeyboard} role="button" tabIndex={0}>
      <div className="budget-progress-top">
        <div>
          <strong>{budget.name}</strong>
          <p>
            <b>{budgetStatusLabel}</b>
          </p>
        </div>
        <button aria-label={`Edit ${budget.name}`} onClick={editBudget} type="button">
          <Pencil aria-hidden="true" size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="budget-progress-body">
        <BudgetTimelineProgress budgetName={budget.name} budgetPeriod={budgetPeriod} progress={progress} />
        <p className="budget-daily-note">
          {remaining > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : `${formatMoney(Math.abs(remaining), true)} over this month`}
        </p>
      </div>
    </article>
  );
}

// Detailed budget screen with progress, chart, and category spending rows.
function BudgetDetailView({
  breakdown,
  budget,
  categoryColors,
  categorySelectOptions,
  onBack,
  onCategoryChange,
  onEdit
}: {
  breakdown: BudgetCategoryBreakdown[];
  budget: UserBudget;
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  onBack: () => void;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onEdit: () => void;
}) {
  const spent = getBudgetSpendFromBreakdown(breakdown);
  const left = Math.max(0, budget.limit - spent);
  const remaining = budget.limit - spent;
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const budgetPeriod = getBudgetPeriod(budget.cadence, budget.periodAnchorDate);
  const daysLeft = getBudgetDaysLeft(budgetPeriod);
  const dailyAmount = getDailyAmount(left, daysLeft);
  const chartCategories = getBudgetChartCategories(breakdown);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCategory && !breakdown.some((item) => item.category === selectedCategory)) {
      setSelectedCategory(null);
    }
  }, [breakdown, selectedCategory]);

  const selectCategory = (category: string) => {
    setSelectedCategory((currentCategory) => currentCategory === category ? null : category);
  };

  return (
    <div className="budget-detail-view">
      <MobilePageHeader
        actions={(
          <Button aria-label={`Edit ${budget.name}`} className="budget-detail-header-action" onClick={onEdit} title="Edit budget" type="button" variant="ghost">
            <Pencil aria-hidden="true" className="h-6 w-6" />
          </Button>
        )}
        leading={(
          <Button aria-label="Back to budgets" className="budget-detail-header-action" onClick={onBack} title="Back to budgets" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" className="h-7 w-7" />
          </Button>
        )}
        title={budget.name}
      />
      <div className="budget-detail-desktop-header">
        <Button aria-label="Back to budgets" onClick={onBack} type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Budgets
        </Button>
        <Button aria-label={`Edit ${budget.name}`} onClick={onEdit} type="button" variant="outline">
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Edit
        </Button>
      </div>
      <section className="budget-detail-hero">
        <div className="budget-detail-title-row">
          <div>
            <h2>{budget.name}</h2>
            <p>{getBudgetStatusLabel(remaining, budget.limit)}</p>
          </div>
        </div>
        <BudgetTimelineProgress budgetName={budget.name} budgetPeriod={budgetPeriod} progress={progress} />
        <p className="budget-daily-note">
          {remaining > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : `${formatMoney(Math.abs(remaining), true)} over this month`}
        </p>
      </section>
      <section className="budget-breakdown-panel">
        {chartCategories.length > 0 ? (
          <div className="budget-breakdown-chart">
            <DonutChart
              ariaLabel={`${budget.name} category spending donut chart`}
              categories={chartCategories}
              categoryColors={categoryColors}
              centerLabel="Spent"
              tooltipShareLabel="of budget spending"
            />
          </div>
        ) : (
          <div className="empty-state">No spending found for this budget this month.</div>
        )}
        <div className="budget-breakdown-list">
          {breakdown.map((item) => (
            <div className="budget-breakdown-stack" key={item.category}>
              <BudgetBreakdownRow
                categoryColors={categoryColors}
                isSelected={selectedCategory === item.category}
                item={item}
                onToggle={() => selectCategory(item.category)}
              />
              <BudgetCategoryTransactionExpansion
                categoryColors={categoryColors}
                categorySelectOptions={categorySelectOptions}
                isOpen={selectedCategory === item.category}
                onCategoryChange={onCategoryChange}
                transactions={item.transactions}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Uses Radix Collapsible state so the open and close transitions stay symmetric.
function BudgetCategoryTransactionExpansion({
  categoryColors,
  categorySelectOptions,
  isOpen,
  onCategoryChange,
  transactions
}: {
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  isOpen: boolean;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  transactions: Transaction[];
}) {
  return (
    <Collapsible open={isOpen}>
      <CollapsibleContent
        className="budget-category-transaction-expansion"
        data-testid="budget-category-transaction-expansion"
      >
        <div>
          <BudgetCategoryTransactions
            categoryColors={categoryColors}
            categorySelectOptions={categorySelectOptions}
            onCategoryChange={onCategoryChange}
            transactions={transactions}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Timeline progress bar that keeps the spend amount and today marker together.
function BudgetTimelineProgress({
  budgetName,
  budgetPeriod,
  progress
}: {
  budgetName: string;
  budgetPeriod: ReturnType<typeof getBudgetPeriod>;
  progress: number;
}) {
  const progressWidth = Math.min(100, Math.max(0, progress));
  const todayProgress = getBudgetPeriodProgress(budgetPeriod);

  return (
    <div className="budget-period-row">
      <span>{formatPeriodDate(budgetPeriod.startDate)}</span>
      <div className="budget-progress-shell">
        <Progress aria-label={`${budgetName} budget progress`} className="budget-progress-track" value={progressWidth} />
        <span className="budget-progress-fill-label" style={{ width: `${progressWidth}%` }}>
          <strong>{Math.round(progress)}%</strong>
        </span>
        <span className="budget-today-marker" style={{ left: `${todayProgress}%` }}>
          <small>Today</small>
        </span>
      </div>
      <span>{formatPeriodDate(budgetPeriod.endDate)}</span>
    </div>
  );
}

// One category row in the selected budget spending breakdown.
function BudgetBreakdownRow({
  categoryColors,
  isSelected,
  item,
  onToggle
}: {
  categoryColors: Record<string, string>;
  isSelected: boolean;
  item: BudgetCategoryBreakdown;
  onToggle: () => void;
}) {
  const color = categoryColors[item.category] || "#607d8b";

  return (
    <article className={cn("budget-breakdown-item", isSelected && "selected")}>
      <button aria-expanded={isSelected} aria-pressed={isSelected} className="budget-breakdown-row" onClick={onToggle} type="button">
        <span className="budget-breakdown-avatar" style={{ background: color }}>
          {item.category.slice(0, 1)}
        </span>
        <span className="budget-breakdown-copy">
          <strong>{item.category}</strong>
          <span>{Math.round(item.percentOfSpending * 100)}% of spending</span>
        </span>
        <span className="budget-breakdown-value">
          <strong>{formatMoney(item.amount, true)}</strong>
          <span>{getTransactionCountLabel(item.transactionCount)}</span>
        </span>
        {isSelected && <span className="budget-breakdown-selection-mark" data-testid="budget-selected-category-indicator">Selected</span>}
      </button>
    </article>
  );
}

// Selected budget category transactions reuse the shared transaction list and details overlay.
function BudgetCategoryTransactions({
  categoryColors,
  categorySelectOptions,
  onCategoryChange,
  transactions
}: {
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  transactions: Transaction[];
}) {
  return (
    <div className="budget-selected-transactions" data-testid="budget-selected-transactions">
      <TransactionList
        categoryColors={categoryColors}
        categorySelectOptions={categorySelectOptions}
        editable
        emptyMessage="No transactions found for this category."
        onCategoryChange={onCategoryChange}
        transactions={transactions}
      />
    </div>
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
  const changeCadence = (cadence: BudgetCadence) => onFormChange({ ...form, cadence });
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
    <form className={cn("grid gap-3.5", isMobileEditor ? "px-[18px] pb-[18px]" : "p-0")} onSubmit={onSubmit}>
      <label className={budgetEditorLabelClassName}>
        Budget name
        <input className={budgetEditorInputClassName} autoComplete="off" onChange={changeName} placeholder="Spending money" value={form.name} />
      </label>
      <label className={budgetEditorLabelClassName}>
        Amount
        <input className={budgetEditorInputClassName} inputMode="decimal" min="0" onChange={changeLimit} placeholder="800" step="0.01" type="number" value={form.limit} />
      </label>
      <section className="budget-cadence-selector">
        <h3>Budget period</h3>
        <div role="group" aria-label="Budget period">
          {budgetCadenceOptions.map((option) => (
            <button
              aria-pressed={form.cadence === option.value}
              className={form.cadence === option.value ? "active" : undefined}
              key={option.value}
              onClick={() => changeCadence(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
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
        <BudgetCategoryMultiSelectDropdown
          onToggle={toggleCategory}
          options={availableCategoryOptions}
          selectedValues={form.categoryNames}
        />
      </section>
      <div className="flex justify-end gap-2.5 pt-1 max-[768px]:grid max-[768px]:grid-cols-1">
        {editingBudget && (
          <Button className="min-w-[132px] border-[rgba(255,125,145,0.28)] text-[var(--danger)] max-[768px]:w-full max-[768px]:min-w-0" onClick={onDelete} type="button" variant="outline">
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            Delete
          </Button>
        )}
        <button className="inline-flex min-h-[38px] min-w-[132px] cursor-pointer items-center justify-center rounded-xl border-0 bg-[var(--primary)] px-4 font-[inherit] text-sm font-extrabold text-[var(--accent-cream)] hover:bg-[var(--primary-hover)] disabled:cursor-default disabled:opacity-50 max-[768px]:w-full max-[768px]:min-w-0" disabled={!canSaveBudget} onClick={onSave} type="button">
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
              <SheetDescription>Set a budget amount, period, and categories that count toward progress.</SheetDescription>
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
          <DrawerDescription className="sr-only">Set a budget amount, period, and categories that count toward progress.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        {formContent}
      </DrawerContent>
    </Drawer>
  );
}

// Compact dropdown for budget category multi-selects in sheets and drawers.
function BudgetCategoryMultiSelectDropdown({
  onToggle,
  options,
  selectedValues
}: {
  onToggle: (category: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  const selectedSet = new Set(selectedValues);
  const [open, setOpen] = useState(false);
  const label = getCategorySelectionLabel(selectedValues, options, "All categories");
  useCloseOnPageScroll(open, () => setOpen(false));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button aria-haspopup="listbox" aria-label="Budget categories" className="category-multi-select-trigger transaction-select-trigger budget-category-multi-select-trigger" data-testid="budget-category-multi-select-trigger" role="combobox" type="button">
          <span>{label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="category-multi-select-content budget-category-multi-select-content" data-testid="budget-category-multi-select-content">
        {options.map((option) => {
          const isActive = selectedSet.has(option);

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "active" : undefined}
              key={option}
              onClick={() => onToggle(option)}
              type="button"
            >
              <span className="category-multi-select-check">
                {isActive && <Check aria-hidden="true" className="h-4 w-4" />}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
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

// Converts string labels into the select option model used by transaction details.
function getSelectOptions(values: string[]): SelectOption[] {
  return values.map((value) => ({
    label: value,
    value
  }));
}

// Summarizes category multi-select state for compact trigger labels.
function getCategorySelectionLabel(selectedValues: string[], options: string[], allLabel: string) {
  if (selectedValues.length === 0) {
    return "No categories selected";
  }

  if (selectedValues.length === options.length) {
    return allLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues.length} selected`;
}

// Creates the form state used for a new monthly budget.
function getEmptyBudgetForm(): BudgetFormState {
  return {
    categoryNames: [],
    cadence: defaultBudgetCadence,
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

  const isPreCadenceBudget = value.cadence === undefined && value.periodAnchorDate === undefined;

  if (!isPreCadenceBudget && (!isBudgetCadence(value.cadence) || typeof value.periodAnchorDate !== "string")) {
    throw new Error("Invalid saved budget: expected cadence and periodAnchorDate.");
  }

  const categoryNames = value.categoryNames.map((category) => {
    if (typeof category !== "string") {
      throw new Error("Invalid saved budget category: expected a string.");
    }

    return category;
  });

  const cadence: BudgetCadence = isPreCadenceBudget ? defaultBudgetCadence : value.cadence as BudgetCadence;
  const periodAnchorDate = isPreCadenceBudget ? getTodayInputDate() : parseBudgetAnchorDate(value.periodAnchorDate as string);

  return {
    categoryNames,
    cadence,
    id: value.id,
    limit: value.limit,
    name: value.name,
    periodAnchorDate
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

// Preserves an existing anchor unless the budget cadence changes.
function getNextBudgetAnchorDate(activeBudget: UserBudget | null, nextCadence: BudgetCadence) {
  return activeBudget && activeBudget.cadence === nextCadence
    ? activeBudget.periodAnchorDate
    : getTodayInputDate();
}

// Formats compact local month/day labels for the budget timeline.
function formatPeriodDate(date: Date) {
  return date.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short"
  });
}

// Converts the remaining budget into a daily allowance.
function getDailyAmount(left: number, daysLeft: number) {
  return left / daysLeft;
}

// Formats the remaining or overspent amount against the full budget limit.
function getBudgetStatusLabel(remaining: number, limit: number) {
  return remaining >= 0
    ? `${formatMoney(remaining, true)} left of ${formatMoney(limit, true)}`
    : `${formatMoney(Math.abs(remaining), true)} over of ${formatMoney(limit, true)}`;
}

// Uses singular wording for one transaction and plural wording otherwise.
function getTransactionCountLabel(count: number) {
  return `${count} ${count === 1 ? "transaction" : "transactions"}`;
}

// Validates saved cadence values before budget calculations run.
function isBudgetCadence(value: unknown): value is BudgetCadence {
  return budgetCadenceOptions.some((option) => option.value === value);
}

// Validates persisted anchor dates and returns the normalized input value.
function parseBudgetAnchorDate(value: string) {
  const timestamp = Date.parse(`${value}T12:00:00`);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid saved budget periodAnchorDate "${value}". Expected YYYY-MM-DD.`);
  }

  return getDateInputValue(new Date(timestamp));
}

// Returns today's date for newly anchored weekly and fortnightly budget periods.
function getTodayInputDate() {
  return getDateInputValue(new Date());
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Narrows unknown persisted JSON before field validation.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
