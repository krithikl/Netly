"use client";

import { type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, History, Pencil, Plus, Trash2 } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { CircularProgress } from "@/components/ui/circular-progress";
import { DonutChart } from "@/components/ui/donut-chart";
import { Progress } from "@/components/ui/progress";
import { MultiSelectDropdown, type MultiSelectDropdownOption } from "@/components/ui/multi-select-dropdown";
import { TransactionList } from "@/features/transactions/TransactionList";
import { MoneyMovementCard } from "@/components/MoneyMovementCard";
import type { SelectOption } from "@/components/ui/select-field";
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
import type { DataMode } from "@/lib/app/types";
import type { RecurringMerchant, Transaction } from "@/lib/types";
import {
  getBudgetCategoryBreakdown,
  getBudgetChartCategories,
  getBudgetDaysLeft,
  getBudgetHistoryPeriodSnapshots,
  getBudgetPeriod,
  getBudgetPeriodProgress,
  getBudgetPeriodTransactions,
  getBudgetSpendFromBreakdown,
  getBudgetTransactionsInPeriod,
  type BudgetCadence,
  type BudgetCategoryBreakdown,
  type BudgetHistoryPeriodSnapshot,
  type BudgetPeriod
} from "@/features/budgets/budgetLogic";

type BudgetsPageProps = {
  categoryOptions: string[];
  categoryColors: Record<string, string>;
  dataMode: DataMode;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
  transactions: Transaction[];
};

type UserBudget = {
  categoryNames: string[];
  cadence: BudgetCadence;
  createdAt: string;
  id: string;
  limit: number;
  name: string;
  periodAnchorDate: string;
};

type BudgetHistoryEntry = BudgetHistoryPeriodSnapshot;

type BudgetStorageState = {
  budgets: UserBudget[];
  history: BudgetHistoryEntry[];
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
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" }
];
const defaultBudgetCadence: BudgetCadence = "monthly";
const budgetListToggleButtonClassName = "grid min-h-full cursor-pointer place-items-center rounded-[22px] border border-[var(--outline-soft)] bg-[var(--surface-2)] font-[inherit] text-[1.05rem] font-black text-[var(--accent-cream)] hover:border-[var(--primary-border)] hover:bg-[var(--surface-3)] max-[768px]:min-h-[60px] max-[768px]:rounded-[20px] max-[768px]:text-base";
const budgetEditorLabelClassName = "grid gap-[7px] text-[11px] font-[850] uppercase tracking-[0.04em] text-[var(--muted)]";
const budgetEditorInputClassName = "min-h-11 w-full rounded-xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3 py-2.5 text-[0.95rem] font-bold text-[var(--ink)] outline-none focus:border-[var(--primary-border)]";

// Budget screen with user-defined budgets calculated from selected categories.
export function BudgetsPage({ categoryOptions, categoryColors, dataMode, onCategoryChange, onRecurringClick, recurring, transactions }: BudgetsPageProps) {
  const [budgetState, setBudgetState] = useState<BudgetStorageState>(getEmptyBudgetStorageState);
  const [editingBudget, setEditingBudget] = useState<UserBudget | null>(null);
  const [budgetStorageError, setBudgetStorageError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBudgetListExpanded, setIsBudgetListExpanded] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [historyBudgetId, setHistoryBudgetId] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetFormState>(getEmptyBudgetForm);
  const budgets = budgetState.budgets;
  const budgetHistory = budgetState.history;
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
  const historyBudget = useMemo(() => renderedBudgets.find((budget) => budget.id === historyBudgetId) || null, [historyBudgetId, renderedBudgets]);
  const historyEntries = useMemo(() => getHistoryEntriesForBudget(budgetHistory, historyBudgetId), [budgetHistory, historyBudgetId]);
  const selectedHistory = useMemo(() => budgetHistory.find((entry) => entry.id === selectedHistoryId) || null, [budgetHistory, selectedHistoryId]);
  const selectedHistoryBudget = useMemo(() => selectedHistory ? getBudgetFromHistoryEntry(selectedHistory) : null, [selectedHistory]);
  const selectedHistoryPeriod = useMemo(() => selectedHistory ? getBudgetPeriodFromHistoryEntry(selectedHistory) : null, [selectedHistory]);
  const selectedBudgetBreakdown = useMemo(
    () => selectedBudget
      ? getBudgetCategoryBreakdown(
          getBudgetPeriodTransactions(transactions, selectedBudget.cadence, selectedBudget.periodAnchorDate),
          selectedBudget.categoryNames
        )
      : [],
    [selectedBudget, transactions]
  );
  const selectedHistoryBreakdown = useMemo(
    () => selectedHistoryBudget && selectedHistoryPeriod
      ? getBudgetCategoryBreakdown(
          getBudgetTransactionsInPeriod(transactions, selectedHistoryPeriod),
          selectedHistoryBudget.categoryNames
        )
      : [],
    [selectedHistoryBudget, selectedHistoryPeriod, transactions]
  );
  const activeBudget = editingBudget || null;
  const formLimit = Number.parseFloat(form.limit);
  const canSaveBudget = form.name.trim().length > 0 && Number.isFinite(formLimit) && formLimit > 0 && form.categoryNames.length > 0;

  useEffect(() => {
    setBudgetState(readSavedBudgetState(dataMode));
  }, [dataMode]);

  useEffect(() => {
    if (selectedBudgetId && !selectedBudget) {
      setSelectedBudgetId(null);
    }
  }, [selectedBudget, selectedBudgetId]);

  useEffect(() => {
    if (historyBudgetId && !historyBudget) {
      setHistoryBudgetId(null);
      setSelectedHistoryId(null);
    }
  }, [historyBudget, historyBudgetId]);

  useEffect(() => {
    if (selectedHistoryId && !selectedHistory) {
      setSelectedHistoryId(null);
    }
  }, [selectedHistory, selectedHistoryId]);

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

    const materializedState = getBudgetStateWithMaterializedHistory(budgetState);
    const nextBudget: UserBudget = {
      categoryNames: form.categoryNames,
      cadence: form.cadence,
      id: activeBudget?.id || createBudgetId(),
      limit: formLimit,
      name: form.name.trim(),
      createdAt: getNextBudgetHistoryStartDate(activeBudget, form.cadence),
      periodAnchorDate: getNextBudgetAnchorDate(activeBudget, form.cadence)
    };
    const shouldReplaceBudget = activeBudget && materializedState.budgets.some((budget) => budget.id === activeBudget.id);
    const nextBudgets = shouldReplaceBudget
      ? materializedState.budgets.map((budget) => budget.id === activeBudget.id ? nextBudget : budget)
      : [...materializedState.budgets, nextBudget];

    setIsEditorOpen(false);
    setBudgetStateAndPersist({ budgets: nextBudgets, history: materializedState.history }, setBudgetState, setBudgetStorageError);
  };
  const submitBudgetForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    saveBudget();
  };
  const deleteBudget = () => {
    if (!activeBudget) {
      return;
    }

    setBudgetStateAndPersist({
      budgets: budgets.filter((budget) => budget.id !== activeBudget.id),
      history: budgetHistory.filter((entry) => entry.budgetId !== activeBudget.id)
    }, setBudgetState, setBudgetStorageError);
    setSelectedBudgetId((currentId) => currentId === activeBudget.id ? null : currentId);
    setHistoryBudgetId((currentId) => currentId === activeBudget.id ? null : currentId);
    setSelectedHistoryId((currentId) => budgetHistory.some((entry) => entry.id === currentId && entry.budgetId === activeBudget.id) ? null : currentId);
    setIsEditorOpen(false);
  };

  if (selectedHistoryBudget && selectedHistoryPeriod) {
    return (
      <section className="view-stack budget-page-layout" data-testid="budget-history-detail-page">
        <BudgetDetailView
          breakdown={selectedHistoryBreakdown}
          budget={selectedHistoryBudget}
          budgetPeriod={selectedHistoryPeriod}
          categoryColors={categoryColors}
          categorySelectOptions={editableCategorySelectOptions}
          isHistory
          onBack={() => setSelectedHistoryId(null)}
          onCategoryChange={onCategoryChange}
        />
        {budgetStorageError && (
          <p className="rounded-[14px] border border-[rgba(229,184,107,0.28)] bg-[rgba(229,184,107,0.1)] px-3 py-2.5 text-[13px] font-bold text-[var(--warning)]">
            {budgetStorageError}
          </p>
        )}
      </section>
    );
  }

  if (historyBudget) {
    return (
      <section className="view-stack budget-page-layout" data-testid="budget-history-page">
        <BudgetHistoryView
          budget={historyBudget}
          entries={historyEntries}
          onBack={() => setHistoryBudgetId(null)}
          onOpenHistory={setSelectedHistoryId}
          transactions={transactions}
        />
      </section>
    );
  }

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
                onHistory={() => setHistoryBudgetId(budget.id)}
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
                <MoneyMovementCard
                  amount={formatMoney(item.average, true)}
                  amountTone="expense"
                  avatarLabel={item.merchant}
                  category={item.category}
                  categoryColor={categoryColors[item.category] || "#607d8b"}
                  detail={getRecurringMeta(item)}
                  key={item.merchant}
                  onClick={() => onRecurringClick(item.merchant)}
                  title={item.merchant}
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
  onHistory,
  onOpen,
  spent
}: {
  budget: UserBudget;
  onHistory: () => void;
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
  const openHistory = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onHistory();
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
        <button aria-label={`View ${budget.name} history`} onClick={openHistory} type="button">
          <History aria-hidden="true" size={20} strokeWidth={2.4} />
        </button>
      </div>
      <div className="budget-progress-body">
        <BudgetTimelineProgress budgetName={budget.name} budgetPeriod={budgetPeriod} progress={progress} />
        <p className="budget-daily-note">
          {remaining > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : `${formatMoney(Math.abs(remaining), true)} over this period`}
        </p>
      </div>
    </article>
  );
}

// Historical budget periods are compact spend-review cards for prior periods.
function BudgetHistoryView({
  budget,
  entries,
  onBack,
  onOpenHistory,
  transactions
}: {
  budget: UserBudget;
  entries: BudgetHistoryEntry[];
  onBack: () => void;
  onOpenHistory: (entryId: string) => void;
  transactions: Transaction[];
}) {
  return (
    <div className="budget-history-view">
      <MobilePageHeader
        leading={(
          <Button aria-label="Back to budgets" className="budget-detail-header-action" onClick={onBack} title="Back to budgets" type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" className="h-7 w-7" />
          </Button>
        )}
        title={`${budget.name} history`}
      />
      <div className="budget-detail-desktop-header">
        <Button aria-label="Back to budgets" onClick={onBack} type="button" variant="ghost">
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          Budgets
        </Button>
      </div>
      <section className="budget-history-panel">
        <PanelTitle title={`${budget.name} history`} subtitle="Prior budget periods and category spending" />
        {entries.length > 0 ? (
          <div className="budget-history-grid">
            {entries.map((entry) => {
              const spent = getBudgetHistorySpend(entry, transactions);
              const progress = getBudgetHistoryProgress(spent, entry.limit);

              return (
                <button
                  className="budget-history-card"
                  key={entry.id}
                  onClick={() => onOpenHistory(entry.id)}
                  style={{
                    alignItems: "center",
                    borderRadius: 18,
                    display: "grid",
                    gap: 14,
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    minHeight: 86,
                    padding: "14px 16px"
                  }}
                  type="button"
                >
                  <div className="budget-history-copy" style={{ display: "grid", gap: 6, minWidth: 0, textTransform: "none" }}>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {getBudgetHistoryPeriodLabel(entry)}
                    </span>
                    <strong
                      style={{
                        fontSize: "clamp(0.92rem, 1.5vw, 1.02rem)",
                        fontWeight: 950,
                        lineHeight: 1.2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textTransform: "none",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {getBudgetHistoryStatusLabel(spent, entry.limit)}
                    </strong>
                  </div>
                  <CircularProgress ariaLabel={`${entry.name} ${getBudgetHistoryPeriodLabel(entry)} budget progress`} value={progress} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No completed budget periods yet.</div>
        )}
      </section>
    </div>
  );
}

// Detailed budget screen with progress, chart, and category spending rows.
function BudgetDetailView({
  breakdown,
  budget,
  budgetPeriod: explicitBudgetPeriod,
  categoryColors,
  categorySelectOptions,
  isHistory = false,
  onBack,
  onCategoryChange,
  onEdit
}: {
  breakdown: BudgetCategoryBreakdown[];
  budget: UserBudget;
  budgetPeriod?: BudgetPeriod;
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  isHistory?: boolean;
  onBack: () => void;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onEdit?: () => void;
}) {
  const spent = getBudgetSpendFromBreakdown(breakdown);
  const left = Math.max(0, budget.limit - spent);
  const remaining = budget.limit - spent;
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const budgetPeriod = explicitBudgetPeriod || getBudgetPeriod(budget.cadence, budget.periodAnchorDate);
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
        actions={!isHistory && onEdit ? (
          <Button aria-label={`Edit ${budget.name}`} className="budget-detail-header-action" onClick={onEdit} title="Edit budget" type="button" variant="ghost">
            <Pencil aria-hidden="true" className="h-6 w-6" />
          </Button>
        ) : null}
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
          {isHistory ? "History" : "Budgets"}
        </Button>
        {!isHistory && onEdit && (
          <Button aria-label={`Edit ${budget.name}`} onClick={onEdit} type="button" variant="outline">
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
      <section className="budget-detail-hero">
        <div className="budget-detail-title-row">
          <div>
            <h2>{budget.name}</h2>
            <p>{getBudgetStatusLabel(remaining, budget.limit)}</p>
          </div>
        </div>
        <BudgetTimelineProgress budgetName={budget.name} budgetPeriod={budgetPeriod} progress={progress} showTodayMarker={!isHistory} />
        <p className="budget-daily-note">
          {isHistory ? getBudgetStatusLabel(remaining, budget.limit) : remaining > 0 ? `You can spend ${formatMoney(dailyAmount, true)}/day for ${daysLeft} more days` : `${formatMoney(Math.abs(remaining), true)} over this period`}
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
  progress,
  showTodayMarker = true
}: {
  budgetName: string;
  budgetPeriod: ReturnType<typeof getBudgetPeriod>;
  progress: number;
  showTodayMarker?: boolean;
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
        {showTodayMarker && (
          <span className="budget-today-marker" style={{ left: `${todayProgress}%` }}>
            <small>Today</small>
          </span>
        )}
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
      <MoneyMovementCard
        amount={formatMoney(item.amount, true)}
        amountDetail={getTransactionCountLabel(item.transactionCount)}
        amountTone="expense"
        ariaExpanded={isSelected}
        ariaPressed={isSelected}
        category={item.category}
        categoryColor={color}
        className="budget-breakdown-card"
        meta={`${Math.round(item.percentOfSpending * 100)}% of spending`}
        onClick={onToggle}
        selected={isSelected}
        showCategoryChip={false}
        testId="budget-breakdown-row"
        title={item.category}
      />
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
    <form className={cn("budget-editor-form grid gap-3.5", isMobileEditor ? "px-[18px] pb-[18px]" : "p-0")} onSubmit={onSubmit}>
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
  const label = getCategorySelectionLabel(selectedValues, options, "All categories");
  const dropdownOptions = getMultiSelectOptions(options);

  return (
    <MultiSelectDropdown
      ariaLabel="Budget categories"
      contentClassName="budget-category-multi-select-content"
      contentTestId="budget-category-multi-select-content"
      label={label}
      onToggle={onToggle}
      options={dropdownOptions}
      selectedValues={selectedValues}
      triggerClassName="budget-category-multi-select-trigger"
      triggerTestId="budget-category-multi-select-trigger"
    />
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
  return `${item.count} payments detected over 90 days`;
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

// Converts labels into the shared multi-select option model.
function getMultiSelectOptions(values: string[]): MultiSelectDropdownOption[] {
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

// Narrows history entries to one budget, newest period first.
function getHistoryEntriesForBudget(history: BudgetHistoryEntry[], budgetId: string | null) {
  if (!budgetId) {
    return [];
  }

  return sortBudgetHistory(history.filter((entry) => entry.budgetId === budgetId));
}

// Turns a historical snapshot into the budget model expected by the detail view.
function getBudgetFromHistoryEntry(entry: BudgetHistoryEntry): UserBudget {
  return {
    categoryNames: entry.categoryNames,
    cadence: entry.cadence,
    createdAt: entry.periodStartDate,
    id: entry.budgetId,
    limit: entry.limit,
    name: entry.name,
    periodAnchorDate: entry.periodStartDate
  };
}

// Converts stored date strings into a full historical budget period.
function getBudgetPeriodFromHistoryEntry(entry: BudgetHistoryEntry): BudgetPeriod {
  const startDate = parseBudgetDate(entry.periodStartDate, "periodStartDate");
  const endDate = parseBudgetDate(entry.periodEndDate, "periodEndDate");

  if (endDate < startDate) {
    throw new Error(`Invalid budget history entry "${entry.id}": periodEndDate must be after periodStartDate.`);
  }

  return {
    endDate,
    filterEndDate: endDate,
    startDate
  };
}

// Calculates historical spend from the live transaction/category data.
function getBudgetHistorySpend(entry: BudgetHistoryEntry, transactions: Transaction[]) {
  return getBudgetSpendFromBreakdown(getBudgetCategoryBreakdown(
    getBudgetTransactionsInPeriod(transactions, getBudgetPeriodFromHistoryEntry(entry)),
    entry.categoryNames
  ));
}

// Formats a historical budget period for compact cards.
function getBudgetHistoryPeriodLabel(entry: BudgetHistoryEntry) {
  return parseBudgetDate(entry.periodStartDate, "periodStartDate").toLocaleDateString("en-NZ", {
    month: "long",
    year: "numeric"
  });
}

// Formats historical remaining or overspent status against the frozen limit.
function getBudgetHistoryStatusLabel(spent: number, limit: number) {
  if (limit <= 0) {
    throw new Error("Budget history target invariant failed: limit must be greater than zero.");
  }

  const remaining = limit - spent;

  return remaining >= 0
    ? `${formatMoney(remaining, true)} left of ${formatMoney(limit, true)}`
    : `${formatMoney(Math.abs(remaining), true)} overspent of ${formatMoney(limit, true)}`;
}

// Returns the raw historical spend ratio so overspend can render extra circle laps.
function getBudgetHistoryProgress(spent: number, limit: number) {
  if (limit <= 0) {
    throw new Error("Budget history progress invariant failed: limit must be greater than zero.");
  }

  return (spent / limit) * 100;
}

// Keeps history in reverse chronological order for review screens.
function sortBudgetHistory(history: BudgetHistoryEntry[]) {
  return [...history].sort((first, second) => second.periodStartDate.localeCompare(first.periodStartDate));
}

// Creates the default form state used for a new budget.
function getEmptyBudgetForm(): BudgetFormState {
  return {
    categoryNames: [],
    cadence: defaultBudgetCadence,
    limit: "800",
    name: "Spending money"
  };
}

// Returns the empty persisted state shape for custom budgets and history.
function getEmptyBudgetStorageState(): BudgetStorageState {
  return {
    budgets: [],
    history: []
  };
}

// Builds demo-mode budget history from the static demo transaction period.
function getDemoBudgetState(): BudgetStorageState {
  const demoBudget: UserBudget = {
    categoryNames: ["Budget demo"],
    cadence: "monthly",
    createdAt: "2025-07-01",
    id: "demo-spending-money",
    limit: 800,
    name: "Spending money",
    periodAnchorDate: "2025-07-01"
  };

  return getBudgetStateWithMaterializedHistory({
    budgets: [demoBudget],
    history: []
  }, new Date("2026-05-24T12:00:00"));
}

// Adds any completed budget periods that are missing from the persisted history.
function getBudgetStateWithMaterializedHistory(budgetState: BudgetStorageState, referenceDate = new Date()): BudgetStorageState {
  const knownHistoryIds = new Set(budgetState.history.map((entry) => entry.id));
  const nextHistory = [...budgetState.history];

  budgetState.budgets.forEach((budget) => {
    getBudgetHistoryPeriodSnapshots(budget, referenceDate).forEach((entry) => {
      if (knownHistoryIds.has(entry.id)) {
        return;
      }

      knownHistoryIds.add(entry.id);
      nextHistory.push(entry);
    });
  });

  return {
    budgets: budgetState.budgets,
    history: sortBudgetHistory(nextHistory)
  };
}

// Demo mode only creates starter data before a user has any saved budget.
function getDemoReadableBudgetState(budgetState: BudgetStorageState) {
  if (budgetState.budgets.length === 0) {
    return getDemoBudgetState();
  }

  return budgetState;
}

// Reads persisted budgets, seeding demo history only when demo mode has no saved budgets.
function readSavedBudgetState(dataMode: DataMode) {
  const storage = getBudgetStorage();
  const storedBudgets = storage?.getItem(budgetsStorageKey);

  if (!storedBudgets) {
    return dataMode === "demo" ? getDemoBudgetState() : getEmptyBudgetStorageState();
  }

  const savedBudgetState = getBudgetStateWithMaterializedHistory(parseSavedBudgetState(storedBudgets));

  return dataMode === "demo" ? getDemoReadableBudgetState(savedBudgetState) : savedBudgetState;
}

// Parses the persisted local budget state and fails loudly on corrupt data.
function parseSavedBudgetState(value: string): BudgetStorageState {
  const parsedValue = JSON.parse(value) as unknown;

  if (Array.isArray(parsedValue)) {
    return {
      budgets: parsedValue.map(parseSavedBudget),
      history: []
    };
  }

  if (!isRecord(parsedValue) || !Array.isArray(parsedValue.budgets) || !Array.isArray(parsedValue.history)) {
    throw new Error("Invalid saved budget state: expected budgets and history arrays.");
  }

  return {
    budgets: parsedValue.budgets.map(parseSavedBudget),
    history: parsedValue.history.map(parseSavedBudgetHistoryEntry)
  };
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
  const createdAt = typeof value.createdAt === "string" ? parseBudgetAnchorDate(value.createdAt) : periodAnchorDate;

  return {
    categoryNames,
    cadence,
    createdAt,
    id: value.id,
    limit: value.limit,
    name: value.name,
    periodAnchorDate
  };
}

// Validates one persisted history period before returning it to the UI.
function parseSavedBudgetHistoryEntry(value: unknown): BudgetHistoryEntry {
  if (!isRecord(value) || typeof value.budgetId !== "string" || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.limit !== "number" || !Array.isArray(value.categoryNames) || !isBudgetCadence(value.cadence) || typeof value.periodStartDate !== "string" || typeof value.periodEndDate !== "string") {
    throw new Error("Invalid saved budget history entry: expected budgetId, period dates, cadence, limit, name, and categoryNames.");
  }

  const categoryNames = value.categoryNames.map((category) => {
    if (typeof category !== "string") {
      throw new Error("Invalid saved budget history category: expected a string.");
    }

    return category;
  });

  return {
    budgetId: value.budgetId,
    categoryNames,
    cadence: value.cadence,
    id: value.id,
    limit: value.limit,
    name: value.name,
    periodEndDate: parseBudgetAnchorDate(value.periodEndDate),
    periodStartDate: parseBudgetAnchorDate(value.periodStartDate)
  };
}

// Stores the complete custom budget state in localStorage.
function setBudgetStateAndPersist(
  budgetState: BudgetStorageState,
  setBudgetState: (budgetState: BudgetStorageState) => void,
  setBudgetStorageError: (message: string) => void
) {
  setBudgetState(budgetState);
  persistBudgetStorage(budgetState, setBudgetStorageError);
}

// Persists budgets and history when browser storage is available.
function persistBudgetStorage(budgetState: BudgetStorageState, setBudgetStorageError: (message: string) => void) {
  const storage = getBudgetStorage();

  if (!storage) {
    setBudgetStorageError("Budget changes are saved for this session only because browser storage is unavailable.");
    return;
  }

  try {
    storage.setItem(budgetsStorageKey, JSON.stringify(budgetState));
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

// Preserves an existing history start unless the budget cadence changes.
function getNextBudgetHistoryStartDate(activeBudget: UserBudget | null, nextCadence: BudgetCadence) {
  return activeBudget && activeBudget.cadence === nextCadence
    ? activeBudget.createdAt
    : getTodayInputDate();
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

// Parses persisted date-only budget fields into local noon Date values.
function parseBudgetDate(value: string, fieldName: string) {
  const timestamp = Date.parse(`${value}T12:00:00`);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid saved budget ${fieldName} "${value}". Expected YYYY-MM-DD.`);
  }

  return new Date(timestamp);
}

// Returns today's date for newly anchored budget periods.
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
