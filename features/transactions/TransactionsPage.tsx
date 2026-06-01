import type { ChangeEvent, TouchEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowDownUp, ArrowLeft, CalendarDays, ChevronDown, MoreVertical, ReceiptText, Search, Settings, Shapes, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import useEmblaCarousel from "embla-carousel-react";
import { TransactionList } from "@/features/transactions/TransactionList";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { MultiSelectDropdown, type MultiSelectDropdownOption } from "@/components/ui/multi-select-dropdown";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
import { formatMoney } from "@/lib/insights";
import { filterTransactionsByDateRange, formatDateInputValue, getThisMonthDateRange } from "@/lib/periods";
import { isIncomeCategoryIncluded } from "@/lib/reporting";
import { type CategoryEditScope } from "@/lib/category-rules";
import { getTransactionCategory, getTransactionDate } from "@/lib/transaction-display";
import { cn } from "@/lib/utils";
import type { Transaction, TransactionDateRange } from "@/lib/types";
import type { TransactionAccountOption, TransactionFilter, TransactionSort } from "@/lib/app/types";
import {
  getActiveFilterCount,
  getTransactionAnalytics,
  getVisibleTransactions,
  toggleFilterSelection,
  type TransactionAnalytics
} from "@/features/transactions/transactionLogic";
import { getTransactionRangeState } from "@/features/transactions/transactionRangeLogic";

export type TransactionOpenPreset = {
  dateRange?: TransactionDateRange;
  id: number;
  openSearch?: boolean;
  query?: string;
  transactionCategory?: string[];
  transactionFilter?: TransactionFilter;
};

type TransactionsPageProps = {
  accountOptions: TransactionAccountOption[];
  categoryColors: Record<string, string>;
  categoryOptions: string[];
  defaultAccountId: string;
  hasMoreTransactions: boolean;
  initialDateRange: TransactionDateRange;
  incomeIncludedCategories: string[];
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  isLoadingTransactionPageRange: boolean;
  isLoadingTransactions: boolean;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onDateRangeChange: (dateRange: TransactionDateRange) => void;
  onMonthRangeChange: (dateRange: TransactionDateRange) => void;
  onLoadAllTransactions: (dateRange: TransactionDateRange) => void;
  onLoadMoreTransactions: (dateRange: TransactionDateRange) => void;
  onOpenPresetConsumed: () => void;
  onOpenSettings: () => void;
  openPreset: TransactionOpenPreset | null;
  transactionLoadError: string;
  transactionLoadNotice: string;
  transactionMonthSourceTransactions: Transaction[];
  transactionPageLoadedDateRange: TransactionDateRange | null;
  transactionSearchSourceTransactions: Transaction[];
  transactions: Transaction[];
};

const transactionFilters: TransactionFilter[] = ["All", "Expenses", "Income"];
const transactionSortOptions: TransactionSort[] = ["Newest", "Oldest", "Amount high", "Amount low"];
const transactionAnalyticsToneClassNames: Record<"green" | "purple" | "red", string> = {
  green: "bg-[rgba(117,208,141,0.13)] text-[var(--success)]",
  purple: "bg-[rgba(137,168,255,0.12)] text-[var(--info)]",
  red: "bg-[rgba(255,125,145,0.12)] text-[var(--danger)]"
};

// Handles transaction search, filters, sorting, and category creation
// Full transactions screen: search, filters, date range, category editing, and pagination.
export function TransactionsPage({
  accountOptions,
  categoryColors,
  categoryOptions,
  defaultAccountId,
  hasMoreTransactions,
  initialDateRange,
  incomeIncludedCategories,
  isLoadingAllTransactions,
  isLoadingMoreTransactions,
  isLoadingTransactionPageRange,
  isLoadingTransactions,
  onCategoryChange,
  onDateRangeChange,
  onMonthRangeChange,
  onLoadAllTransactions,
  onLoadMoreTransactions,
  onOpenPresetConsumed,
  onOpenSettings,
  openPreset,
  transactionLoadError,
  transactionLoadNotice,
  transactionMonthSourceTransactions,
  transactionPageLoadedDateRange,
  transactionSearchSourceTransactions,
  transactions
}: TransactionsPageProps) {
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>("All");
  const [transactionSort, setTransactionSort] = useState<TransactionSort>("Newest");
  const [transactionAccounts, setTransactionAccounts] = useState<string[]>(() => getDefaultAccountFilter(defaultAccountId));
  const [transactionCategory, setTransactionCategory] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDateRange, setSearchDateRange] = useState<TransactionDateRange | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value);
  const editableCategoryOptions = useMemo(() => categoryOptions.filter((category) => category !== "All categories"), [categoryOptions]);
  const editableCategorySelectOptions = useMemo(() => getStringOptions(editableCategoryOptions), [editableCategoryOptions]);
  const filterSelectOptions = useMemo(() => getStringOptions(transactionFilters), []);
  const sortSelectOptions = useMemo(() => getStringOptions(transactionSortOptions), []);
  const isBottomNavigation = useIsBottomNavigation();
  const transactionRangeState = useMemo(() => getTransactionRangeState({
    activeDateRange: dateRange,
    hasMoreTransactions,
    isLoadingTransactionPageRange,
    isLoadingTransactions,
    loadedDateRange: transactionPageLoadedDateRange,
    pageTransactions: transactions,
    sourceTransactions: transactionSearchSourceTransactions
  }), [dateRange, hasMoreTransactions, isLoadingTransactionPageRange, isLoadingTransactions, transactionPageLoadedDateRange, transactionSearchSourceTransactions, transactions]);
  const dateRangeTransactions = transactionRangeState.transactions;
  const hasMoreActiveRangeTransactions = transactionRangeState.hasMoreTransactions;
  const allLoadedDateRange = useMemo(() => getLoadedTransactionDateRange(dateRangeTransactions) || dateRange, [dateRangeTransactions, dateRange]);
  const activeSearchDateRange = searchDateRange || allLoadedDateRange;
  const searchDateRangeTransactions = useMemo(() => filterTransactionsByDateRange(transactionSearchSourceTransactions, activeSearchDateRange), [activeSearchDateRange, transactionSearchSourceTransactions]);
  const monthOptions = useMemo(() => getTransactionMonthOptions(dateRange, transactionMonthSourceTransactions), [dateRange, transactionMonthSourceTransactions]);
  const monthSummaryTransactions = useMemo(() => filterTransactionsByAccount(dateRangeTransactions, transactionAccounts), [dateRangeTransactions, transactionAccounts]);
  const monthSummary = useMemo(() => getTransactionMonthSummary(monthSummaryTransactions, incomeIncludedCategories), [incomeIncludedCategories, monthSummaryTransactions]);
  const shownTransactions = useMemo(
    () => getVisibleTransactions(dateRangeTransactions, isBottomNavigation ? "" : query, transactionAccounts, transactionCategory, transactionFilter, transactionSort),
    [dateRangeTransactions, isBottomNavigation, query, transactionAccounts, transactionCategory, transactionFilter, transactionSort]
  );
  const searchShownTransactions = useMemo(
    () => getVisibleTransactions(searchDateRangeTransactions, query, transactionAccounts, transactionCategory, transactionFilter, transactionSort),
    [query, searchDateRangeTransactions, transactionAccounts, transactionCategory, transactionFilter, transactionSort]
  );
  const shouldGroupTransactionsByDate = transactionSort === "Newest" || transactionSort === "Oldest";
  const shouldShowListLoading = transactionRangeState.shouldShowListLoading;
  const shouldShowMonthSummaryLoading = transactionRangeState.shouldShowMonthSummaryLoading;
  const analytics = useMemo(() => getTransactionAnalytics(shownTransactions, dateRange), [shownTransactions, dateRange]);
  const activeFilterCount = getActiveFilterCount(transactionFilter, transactionAccounts, transactionCategory);
  const [pageSwipeStart, setPageSwipeStart] = useState<{ x: number; y: number } | null>(null);
  const changeDateRange = (nextDateRange: TransactionDateRange) => {
    setDateRange(nextDateRange);
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
    setTransactionCategory([]);
    onDateRangeChange(nextDateRange);
  };
  const changeMonthRange = (nextDateRange: TransactionDateRange) => {
    if (nextDateRange.from === dateRange.from && nextDateRange.to === dateRange.to) {
      return;
    }

    setDateRange(nextDateRange);
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
    setTransactionCategory([]);
    onMonthRangeChange(nextDateRange);
  };
  const resetFilters = () => {
    setTransactionFilter("All");
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
    setTransactionCategory([]);
  };
  const selectMonth = (monthDate: Date) => changeMonthRange(getMonthDateRange(monthDate));
  const selectPreviousMonth = () => selectBoundedAdjacentMonth(dateRange, monthOptions, -1, changeMonthRange);
  const selectNextMonth = () => selectBoundedAdjacentMonth(dateRange, monthOptions, 1, changeMonthRange);
  const openSearch = () => {
    setSearchDateRange(getLoadedTransactionDateRange(transactionSearchSourceTransactions) || dateRange);
    setSearchOpen(true);
  };
  const closeSearch = () => setSearchOpen(false);
  const startPageSwipe = (event: TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];

    if (!touch) {
      return;
    }

    setPageSwipeStart({ x: touch.clientX, y: touch.clientY });
  };
  const finishPageSwipe = (event: TouchEvent<HTMLElement>) => {
    if (!pageSwipeStart) {
      return;
    }

    const touch = event.changedTouches[0];
    setPageSwipeStart(null);

    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - pageSwipeStart.x;
    const deltaY = touch.clientY - pageSwipeStart.y;

    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
      return;
    }

    if (deltaX < 0) {
      selectNextMonth();
      return;
    }

    selectPreviousMonth();
  };
  
  // Let mobile users choose multiple categories, or clear them with All categories
  const toggleTransactionCategory = (category: string) => {
    if (category === "All categories") {
      setTransactionCategory([]);
      return;
    }

    setTransactionCategory(toggleFilterSelection(transactionCategory, category));
  };
  const toggleTransactionAccount = (account: string) => {
    if (account === allAccountsValue) {
      setTransactionAccounts([]);
      return;
    }

    setTransactionAccounts(toggleFilterSelection(transactionAccounts, account));
  };
  const closeSort = () => setSortOpen(false);
  const reviewNeedsReview = () => {
    setQuery("");
    setTransactionFilter("All");
    setTransactionCategory(["Needs review"]);
  };

  useEffect(() => {
    setDateRange(initialDateRange);
  }, [initialDateRange]);

  useEffect(() => {
    if (!openPreset) {
      return;
    }

    setQuery(openPreset.query || "");
    setTransactionFilter(openPreset.transactionFilter || "All");
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
    setTransactionCategory(openPreset.transactionCategory || []);

    if (openPreset.dateRange) {
      setDateRange(openPreset.dateRange);
      onDateRangeChange(openPreset.dateRange);
    }

    if (openPreset.openSearch && openPreset.query) {
      setSearchDateRange(getLoadedTransactionDateRange(transactionSearchSourceTransactions) || openPreset.dateRange || dateRange);
      setSearchOpen(true);
    }

    onOpenPresetConsumed();
  }, [dateRange, defaultAccountId, onDateRangeChange, onOpenPresetConsumed, openPreset, transactionSearchSourceTransactions]);

  useEffect(() => {
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
  }, [defaultAccountId]);

  if (searchOpen) {
    return (
      <section className="transaction-search-page view-stack" data-testid="transaction-search-page">
        <MobileTransactionSearchView
          activeFilterCount={activeFilterCount}
          categoryColors={categoryColors}
          categorySelectOptions={editableCategorySelectOptions}
          dateRange={activeSearchDateRange}
          emptyMessage="No transactions match the current search."
          hasMoreTransactions={hasMoreActiveRangeTransactions}
          groupByDate={shouldGroupTransactionsByDate}
          isLoadingAllTransactions={isLoadingAllTransactions}
          isLoadingMoreTransactions={isLoadingMoreTransactions}
          isLoadingTransactions={shouldShowListLoading}
          onBack={closeSearch}
          onCategoryChange={onCategoryChange}
          onDateRangeChange={setSearchDateRange}
          onFilterOpen={() => setFiltersOpen(true)}
          onLoadAllTransactions={() => onLoadAllTransactions(activeSearchDateRange)}
          onLoadMoreTransactions={() => onLoadMoreTransactions(activeSearchDateRange)}
          onOpenSettings={onOpenSettings}
          onSearchChange={handleSearchChange}
          onSortOpen={() => setSortOpen(true)}
          query={query}
          transactions={searchShownTransactions}
        />
        <TransactionFilterDialog
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          onAccountToggle={toggleTransactionAccount}
          onCategoryToggle={toggleTransactionCategory}
          onOpenChange={setFiltersOpen}
          onReset={resetFilters}
          onStatusChange={setTransactionFilter}
          open={filtersOpen}
          transactionAccounts={transactionAccounts}
          transactionCategory={transactionCategory}
          transactionFilter={transactionFilter}
        />
        <TransactionSortDialog
          onApply={closeSort}
          onOpenChange={setSortOpen}
          onSortChange={setTransactionSort}
          open={sortOpen}
          transactionSort={transactionSort}
        />
      </section>
    );
  }

  return (
    <section
      className="transaction-page view-stack"
      data-testid="transactions-page"
      onTouchCancel={() => setPageSwipeStart(null)}
      onTouchEnd={finishPageSwipe}
      onTouchStart={startPageSwipe}
      suppressHydrationWarning
    >
      <MobilePageHeader
        actions={(
          <div className="flex items-center justify-end gap-2">
            <Button aria-label="Search transactions" className="transaction-icon-action" onClick={openSearch} title="Search" type="button" variant="secondary">
              <Search aria-hidden="true" className="h-5 w-5" />
            </Button>
            <TransactionMobileMenu
              activeFilterCount={activeFilterCount}
              onFilterOpen={() => setFiltersOpen(true)}
              onOpenSettings={onOpenSettings}
              onSortOpen={() => setSortOpen(true)}
            />
          </div>
        )}
        title="Transactions"
      />
      <TransactionMonthOverview
        activeDateRange={dateRange}
        isLoading={shouldShowMonthSummaryLoading}
        monthOptions={monthOptions}
        monthSummary={monthSummary}
        onMonthSelect={selectMonth}
      />

      <section className="transaction-workspace">
        <div className="transaction-filter-panel" suppressHydrationWarning>
          <div className="transaction-controls transaction-desktop-controls">
            <label className="transaction-search-label">
              Search
              <span className="relative block min-w-0">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className="search"
                  onChange={handleSearchChange}
                  placeholder="Search merchant, bank text, category"
                  value={query}
                />
              </span>
            </label>
            <TransactionDateRangePicker dateRange={dateRange} onChange={changeDateRange} />
            <TransactionDesktopFilterPopover
              accountOptions={accountOptions}
              activeFilterCount={activeFilterCount}
              categoryOptions={categoryOptions}
              categorySelectValue={transactionCategory}
              filterSelectOptions={filterSelectOptions}
              onAccountToggle={toggleTransactionAccount}
              onCategoryToggle={toggleTransactionCategory}
              onReset={resetFilters}
              onStatusChange={setTransactionFilter}
              selectedAccounts={transactionAccounts}
              transactionFilter={transactionFilter}
            />
            <label className="transaction-sort-control">
              Sort
              <span className="transaction-sort-select-wrap">
                <ArrowDownUp aria-hidden="true" className="h-4 w-4" />
                <SelectField className="transaction-select-trigger transaction-sort-select-trigger" onChange={setTransactionSort} options={sortSelectOptions} value={transactionSort} />
              </span>
            </label>
          </div>
        </div>
        <TransactionFilterDialog
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          onAccountToggle={toggleTransactionAccount}
          onCategoryToggle={toggleTransactionCategory}
          onOpenChange={setFiltersOpen}
          onReset={resetFilters}
          onStatusChange={setTransactionFilter}
          open={filtersOpen}
          transactionAccounts={transactionAccounts}
          transactionCategory={transactionCategory}
          transactionFilter={transactionFilter}
        />
        <TransactionSortDialog
          onApply={closeSort}
          onOpenChange={setSortOpen}
          onSortChange={setTransactionSort}
          open={sortOpen}
          transactionSort={transactionSort}
        />
        <TransactionLoadMessage error={transactionLoadError} notice={transactionLoadNotice} />
        {analytics.needsReviewCount > 0 && (
          <button className="transaction-review-shortcut transaction-list-review-shortcut" onClick={reviewNeedsReview} type="button">
            {analytics.needsReviewCount} need review
          </button>
        )}
        <TransactionList
          categoryColors={categoryColors}
          editable
          categorySelectOptions={editableCategorySelectOptions}
          emptyMessage={transactionLoadNotice ? "No transactions found for this period." : "No transactions match the current filters."}
          groupByDate={shouldGroupTransactionsByDate}
          onCategoryChange={onCategoryChange}
          hasMore={hasMoreActiveRangeTransactions}
          isLoading={shouldShowListLoading}
          isLoadingAll={isLoadingAllTransactions}
          isLoadingMore={isLoadingMoreTransactions}
          onLoadAll={() => onLoadAllTransactions(dateRange)}
          onLoadMore={() => onLoadMoreTransactions(dateRange)}
          transactions={shownTransactions}
        />
      </section>
    </section>
  );
}

function TransactionLoadMessage({ error, notice }: { error: string; notice: string }) {
  const message = error || notice;

  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "transaction-load-message rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3.5 py-3 text-[0.86rem] font-[760] leading-[1.35] text-[var(--muted)]",
        error && "border-[rgba(255,125,145,0.38)] text-[var(--danger)]"
      )}
      role={error ? "alert" : "status"}
    >
      {message}
    </div>
  );
}

type TransactionMonthOption = {
  date: Date;
  label: string;
  monthKey: string;
  shortLabel: string;
  yearLabel: string;
};

type TransactionMonthSummary = {
  expenses: number;
  income: number;
  net: number;
};

// Month-first navigation and totals for the active transaction period.
function TransactionMonthOverview({
  activeDateRange,
  isLoading,
  monthOptions,
  monthSummary,
  onMonthSelect
}: {
  activeDateRange: TransactionDateRange;
  isLoading: boolean;
  monthOptions: TransactionMonthOption[];
  monthSummary: TransactionMonthSummary;
  onMonthSelect: (monthDate: Date) => void;
}) {
  const activeDate = parseInputDate(activeDateRange.from) || new Date();
  const activeMonthKey = getMonthKey(activeDate);
  const activeMonthIndex = monthOptions.findIndex((option) => option.monthKey === activeMonthKey);
  const activeMonthSnapIndex = activeMonthIndex < 0 ? 0 : activeMonthIndex;
  const [monthEmblaRef, monthEmblaApi] = useEmblaCarousel({
    align: "center",
    dragFree: true,
    slides: ".transaction-month-slide",
    slidesToScroll: 1,
    startIndex: activeMonthSnapIndex
  });
  const shouldCenterSelectedMonthImmediatelyRef = useRef(false);

  useEffect(() => {
    if (monthEmblaApi && activeMonthSnapIndex >= 0) {
      monthEmblaApi.scrollTo(activeMonthSnapIndex, shouldCenterSelectedMonthImmediatelyRef.current);
    }

    shouldCenterSelectedMonthImmediatelyRef.current = false;
  }, [activeMonthSnapIndex, monthEmblaApi]);
  const selectCarouselMonth = (monthDate: Date) => {
    shouldCenterSelectedMonthImmediatelyRef.current = true;
    onMonthSelect(monthDate);
  };

  return (
    <section className="transaction-month-overview">
      <div
        className="transaction-month-carousel"
        aria-label="Transaction month carousel"
        onTouchCancel={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <div className="transaction-month-rail" ref={monthEmblaRef}>
          <div className="transaction-month-track" aria-label="Transaction month">
            <div aria-hidden="true" className="transaction-month-spacer" />
            {monthOptions.map((option) => (
              <div className="transaction-month-slide" key={option.monthKey}>
                <button
                  aria-current={option.monthKey === activeMonthKey ? "date" : undefined}
                  className={option.monthKey === activeMonthKey ? "active" : undefined}
                  onClick={() => selectCarouselMonth(option.date)}
                  type="button"
                >
                  <span className="transaction-month-label">
                    <span className="transaction-month-label-full">{option.label}</span>
                    <span className="transaction-month-label-short">{option.shortLabel}</span>
                    {option.yearLabel && <span className="transaction-month-year">{option.yearLabel}</span>}
                  </span>
                </button>
              </div>
            ))}
            <div aria-hidden="true" className="transaction-month-spacer" />
          </div>
        </div>
      </div>
      <div className="transaction-month-summary" aria-label="Monthly transaction summary">
        <TransactionMonthMetric kind="out" label="Money out" tone="expense" value={isLoading ? "Loading" : formatMoney(monthSummary.expenses, true)} />
        <TransactionMonthMetric kind="in" label="Money in" tone="income" value={isLoading ? "Loading" : formatMoney(monthSummary.income, true)} />
        <TransactionMonthMetric kind="net" label="Net movement" tone={monthSummary.net < 0 ? "expense" : "income"} value={isLoading ? "Loading" : formatMoney(monthSummary.net, true)} />
      </div>
    </section>
  );
}

// One desktop/mobile monthly cashflow metric.
function TransactionMonthMetric({ kind, label, tone, value }: { kind: "in" | "net" | "out"; label: string; tone: "expense" | "income"; value: string }) {
  return (
    <article aria-label={`${label}: ${value}`} className={`transaction-month-metric ${tone} ${kind}`}>
      <span className="transaction-month-metric-label">{label}</span>
      <span aria-hidden="true" className="transaction-month-metric-symbol">{getTransactionMonthMetricSymbol(kind)}</span>
      <strong>{value}</strong>
    </article>
  );
}

// Compact mobile symbols keep the summary dense while labels remain accessible.
function getTransactionMonthMetricSymbol(kind: "in" | "net" | "out") {
  if (kind === "in") {
    return "+";
  }

  if (kind === "out") {
    return "-";
  }

  return "=";
}

// Compact KPI strip shown above the transaction table/list.
function TransactionAnalyticsSummary({
  analytics,
  onReviewNeedsReview
}: {
  analytics: TransactionAnalytics;
  onReviewNeedsReview: () => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3.5 max-[768px]:grid-cols-2 max-[768px]:gap-2.5">
      <TransactionAnalyticsCard
        icon={ReceiptText}
        label="Total spending"
        tone="purple"
        value={formatMoney(analytics.totalSpending, true)}
      />
      <TransactionAnalyticsCard
        icon={CalendarDays}
        label="Average per day"
        tone="purple"
        value={formatMoney(analytics.averagePerDay, true)}
      />
      <TransactionAnalyticsCard
        icon={Shapes}
        label="Categories"
        note="Active"
        tone="green"
        value={analytics.activeCategoryCount.toString()}
      />
      <TransactionAnalyticsCard
        actionLabel="Review"
        icon={AlertCircle}
        label="Needs review"
        onAction={onReviewNeedsReview}
        tone="red"
        value={analytics.needsReviewCount.toString()}
      />
    </div>
  );
}

function TransactionAnalyticsCard({
  actionLabel,
  icon: Icon,
  label,
  note = "This period",
  onAction,
  tone,
  value
}: {
  actionLabel?: string;
  icon: LucideIcon;
  label: string;
  note?: string;
  onAction?: () => void;
  tone: "green" | "purple" | "red";
  value: string;
}) {
  return (
    <article className="grid min-h-28 grid-cols-[46px_minmax(0,1fr)] items-center gap-3.5 rounded-[18px] border border-[var(--outline-soft)] bg-[var(--surface)] p-5 shadow-none max-[768px]:min-h-[116px] max-[768px]:grid-cols-[40px_minmax(0,1fr)] max-[768px]:gap-3 max-[768px]:p-3.5">
      <span className={cn("grid h-11 w-11 place-items-center rounded-full max-[768px]:h-10 max-[768px]:w-10", transactionAnalyticsToneClassNames[tone])}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="grid min-w-0 gap-1">
        <span className="text-[0.78rem] font-[850] text-[var(--muted)]">{label}</span>
        <strong className="truncate text-xl font-black text-[var(--ink)] tabular-nums max-[768px]:text-[1.08rem]">{value}</strong>
        {actionLabel && onAction ? (
          <button className="mt-1 text-left text-[0.78rem] font-bold text-[var(--muted)]" onClick={onAction} type="button">
            {actionLabel}
          </button>
        ) : (
          <small className="text-[0.78rem] font-bold text-[var(--muted)]">{note}</small>
        )}
      </div>
    </article>
  );
}

function TransactionDesktopFilterPopover({
  accountOptions,
  activeFilterCount,
  categoryOptions,
  categorySelectValue,
  filterSelectOptions,
  onAccountToggle,
  onCategoryToggle,
  onReset,
  onStatusChange,
  selectedAccounts,
  transactionFilter
}: {
  accountOptions: TransactionAccountOption[];
  activeFilterCount: number;
  categoryOptions: string[];
  categorySelectValue: string[];
  filterSelectOptions: { label: string; value: TransactionFilter }[];
  onAccountToggle: (account: string) => void;
  onCategoryToggle: (category: string) => void;
  onReset: () => void;
  onStatusChange: (filter: TransactionFilter) => void;
  selectedAccounts: string[];
  transactionFilter: TransactionFilter;
}) {
  const filterLabel = activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters";

  return (
    <div className="transaction-filter-popover-field">
      <span>Filters</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button className="transaction-filter-trigger" type="button" variant="outline">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            {filterLabel}
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="transaction-filter-popover">
          <div className="transaction-filter-popover-header">
            <strong>Filters</strong>
            <button onClick={onReset} type="button">Reset</button>
          </div>
          <label>
            Status
            <SelectField className="transaction-select-trigger" onChange={onStatusChange} options={filterSelectOptions} value={transactionFilter} />
          </label>
          <label>
            Account
            <FilterMultiSelect
              allLabel="All accounts"
              allValue={allAccountsValue}
              onToggle={onAccountToggle}
              options={getAccountFilterOptions(accountOptions)}
              selectedValues={selectedAccounts}
            />
          </label>
          <label>
            Category
            <FilterMultiSelect
              allLabel="All categories"
              allValue="All categories"
              onToggle={onCategoryToggle}
              options={getCategoryFilterOptions(categoryOptions)}
              selectedValues={categorySelectValue}
            />
          </label>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TransactionDateRangePicker({
  dateRange,
  mode = "desktop",
  onChange,
}: {
  dateRange: TransactionDateRange;
  mode?: "compact" | "desktop";
  onChange: (dateRange: TransactionDateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isMobilePicker, setIsMobilePicker] = useState(false);
  const isBottomNavigation = useIsBottomNavigation();
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => toCalendarRange(dateRange));
  const calendarStartMonth = useMemo(() => new Date(2018, 0, 1), []);
  const calendarEndMonth = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear() + 1, 11, 31);
  }, []);
  const label = getDateRangeLabel(dateRange);

  const applyDraftRange = () => {
    if (!draftRange?.from || !draftRange.to) {
      return;
    }

    onChange({
      from: formatDateInputValue(draftRange.from),
      to: formatDateInputValue(draftRange.to)
    });
    setOpen(false);
  };
  const selectPreset = (preset: TransactionDatePreset) => setDraftRange(toCalendarRange(getPresetDateRange(preset)));
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      setDraftRange(toCalendarRange(dateRange));
    }
  };
  const pickerContent = (
    <TransactionDatePickerContent
      calendarEndMonth={calendarEndMonth}
      calendarStartMonth={calendarStartMonth}
      draftRange={draftRange}
      onApply={applyDraftRange}
      onDraftRangeChange={setDraftRange}
      onPresetSelect={selectPreset}
    />
  );
  const triggerClassName = mode === "compact"
    ? `transaction-date-range-trigger ${isBottomNavigation ? "mobile" : "compact"}`
    : "transaction-date-range-trigger desktop";
  const isMobileIconOnly = mode === "compact" && isBottomNavigation;
  const triggerButton = (
    <Button className={triggerClassName} onClick={() => {
      setIsMobilePicker(mode === "compact" && isBottomNavigation);
      handleOpenChange(true);
    }} type="button" variant="secondary" aria-label={isMobileIconOnly ? `Date range: ${label}` : undefined} title={isMobileIconOnly ? label : undefined}>
      <CalendarDays aria-hidden="true" className="h-4 w-4" />
      <span className={isMobileIconOnly ? "sr-only" : undefined}>{label}</span>
    </Button>
  );

  return (
    <>
      {mode === "compact" && isBottomNavigation && triggerButton}
      <Drawer onOpenChange={handleOpenChange} open={open && isMobilePicker && isBottomNavigation}>
        <DrawerContent className="transaction-date-drawer">
          <DrawerHeader className="mobile-filter-header">
            <DrawerTitle>Date range</DrawerTitle>
            <DrawerDescription className="sr-only">Choose a transaction date range.</DrawerDescription>
            <DrawerHeaderClose className="mobile-filter-close" />
          </DrawerHeader>
          {pickerContent}
        </DrawerContent>
      </Drawer>
      {(mode === "desktop" || !isBottomNavigation) && (
        <Popover onOpenChange={handleOpenChange} open={open && !isMobilePicker}>
          <PopoverTrigger asChild>
            {triggerButton}
          </PopoverTrigger>
          <PopoverContent align="start" className="transaction-date-popover">
            {pickerContent}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}

function TransactionDatePickerContent({
  calendarEndMonth,
  calendarStartMonth,
  draftRange,
  onApply,
  onDraftRangeChange,
  onPresetSelect
}: {
  calendarEndMonth: Date;
  calendarStartMonth: Date;
  draftRange: DateRange | undefined;
  onApply: () => void;
  onDraftRangeChange: (range: DateRange | undefined) => void;
  onPresetSelect: (preset: TransactionDatePreset) => void;
}) {
  return (
    <div className="transaction-date-picker">
      <div className="transaction-date-presets">
        {datePresets.map((preset) => (
          <button key={preset} onClick={() => onPresetSelect(preset)} type="button">
            {preset}
          </button>
        ))}
      </div>
      <Calendar
        captionLayout="dropdown"
        defaultMonth={draftRange?.from}
        endMonth={calendarEndMonth}
        fixedWeeks
        mode="range"
        navLayout="after"
        numberOfMonths={1}
        onSelect={onDraftRangeChange}
        selected={draftRange}
        startMonth={calendarStartMonth}
      />
      <div className="transaction-date-popover-footer">
        <span>{getDraftRangeLabel(draftRange)}</span>
        <Button disabled={!draftRange?.from || !draftRange.to} onClick={onApply} type="button">
          Apply
        </Button>
      </div>
    </div>
  );
}

type TransactionDatePreset = "This month" | "Last 30 days" | "Last 90 days" | "This year";

const datePresets: TransactionDatePreset[] = ["This month", "Last 30 days", "Last 90 days", "This year"];

function getPresetDateRange(preset: TransactionDatePreset) {
  const today = new Date();

  if (preset === "This month") {
    return getThisMonthDateRange(today);
  }

  if (preset === "This year") {
    return {
      from: formatDateInputValue(new Date(today.getFullYear(), 0, 1)),
      to: formatDateInputValue(today)
    };
  }

  const days = preset === "Last 30 days" ? 30 : 90;
  const from = new Date(today);
  from.setDate(today.getDate() - days + 1);

  return {
    from: formatDateInputValue(from),
    to: formatDateInputValue(today)
  };
}

function toCalendarRange(dateRange: TransactionDateRange): DateRange | undefined {
  const from = parseInputDate(dateRange.from);
  const to = parseInputDate(dateRange.to);

  if (!from && !to) {
    return undefined;
  }

  return { from, to };
}

function parseInputDate(value: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function getDateRangeLabel(dateRange: TransactionDateRange) {
  const from = parseInputDate(dateRange.from);
  const to = parseInputDate(dateRange.to);

  if (!from && !to) {
    return "Choose dates";
  }

  if (!from || !to) {
    return from ? `From ${format(from, "d MMM yyyy")}` : `To ${format(to as Date, "d MMM yyyy")}`;
  }

  return `${format(from, "d MMM yyyy")} - ${format(to, "d MMM yyyy")}`;
}

function getDraftRangeLabel(dateRange: DateRange | undefined) {
  if (!dateRange?.from) {
    return "Select start and end";
  }

  if (!dateRange.to) {
    return `From ${format(dateRange.from, "d MMM yyyy")}`;
  }

  return `${format(dateRange.from, "d MMM yyyy")} - ${format(dateRange.to, "d MMM yyyy")}`;
}

// Builds a bounded month carousel from the first available transaction month.
function getTransactionMonthOptions(dateRange: TransactionDateRange, sourceTransactions: Transaction[]): TransactionMonthOption[] {
  const activeDate = parseInputDate(dateRange.from) || new Date();
  const { endDate, startDate } = getTransactionMonthOptionBounds(activeDate, sourceTransactions);
  const currentYear = new Date().getFullYear();
  const monthCount = getMonthDifference(startDate, endDate) + 1;

  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);
    const includeYear = date.getFullYear() !== currentYear;

    return {
      date,
      label: format(date, "MMMM"),
      monthKey: getMonthKey(date),
      shortLabel: format(date, "MMM"),
      yearLabel: includeYear ? format(date, "yyyy") : ""
    };
  });
}

// Uses known transaction history as the lower month bound, with a centered fallback for empty data.
function getTransactionMonthOptionBounds(activeDate: Date, sourceTransactions: Transaction[]) {
  const activeMonth = getMonthStart(activeDate);
  const earliestTransactionMonth = getEarliestTransactionMonth(sourceTransactions);

  if (!earliestTransactionMonth) {
    return {
      endDate: addMonths(activeMonth, 6),
      startDate: addMonths(activeMonth, -6)
    };
  }

  const currentMonth = getMonthStart(new Date());

  return {
    endDate: activeMonth > currentMonth ? activeMonth : currentMonth,
    startDate: activeMonth < earliestTransactionMonth ? activeMonth : earliestTransactionMonth
  };
}

// Finds the first calendar month represented by loaded or archived transactions.
function getEarliestTransactionMonth(transactions: Transaction[]): Date | null {
  let earliestMonth: Date | null = null;

  transactions.forEach((transaction) => {
    const date = parseInputDate(getTransactionDate(transaction));

    if (!date) {
      return;
    }

    const month = getMonthStart(date);

    if (!earliestMonth || month < earliestMonth) {
      earliestMonth = month;
    }
  });

  return earliestMonth;
}

// Selects adjacent months only when they are represented in the carousel bounds.
function selectBoundedAdjacentMonth(
  dateRange: TransactionDateRange,
  monthOptions: TransactionMonthOption[],
  offset: -1 | 1,
  onMonthSelect: (dateRange: TransactionDateRange) => void
) {
  const activeMonthKey = getMonthKey(parseInputDate(dateRange.from) || new Date());
  const activeIndex = monthOptions.findIndex((option) => option.monthKey === activeMonthKey);
  const nextOption = activeIndex >= 0 ? monthOptions[activeIndex + offset] : null;

  if (!nextOption) {
    return;
  }

  onMonthSelect(getMonthDateRange(nextOption.date));
}

// Converts a month selection into the complete calendar month range.
function getMonthDateRange(monthDate: Date): TransactionDateRange {
  return {
    from: formatDateInputValue(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)),
    to: formatDateInputValue(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0))
  };
}

// Moves a date by whole calendar months while staying on the first of the month.
function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

// Normalizes any date to the first day of its calendar month.
function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Counts whole calendar months between two month-start dates.
function getMonthDifference(startDate: Date, endDate: Date) {
  return (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
}

// Totals money movement for the active month before search/filter narrowing.
function getTransactionMonthSummary(transactions: Transaction[], incomeIncludedCategories: string[]): TransactionMonthSummary {
  return transactions.reduce<TransactionMonthSummary>((summary, transaction) => {
    if (transaction.amount < 0) {
      summary.expenses += Math.abs(transaction.amount);
    } else if (isIncomeCategoryIncluded(getTransactionCategory(transaction), incomeIncludedCategories)) {
      summary.income += transaction.amount;
      summary.net += transaction.amount;
      return summary;
    }

    if (transaction.amount < 0) {
      summary.net += transaction.amount;
    }

    return summary;
  }, { expenses: 0, income: 0, net: 0 });
}

function getDefaultAccountFilter(defaultAccountId: string) {
  return defaultAccountId ? [defaultAccountId] : [];
}

function filterTransactionsByAccount(transactions: Transaction[], accountIds: string[]) {
  if (accountIds.length === 0) {
    return transactions;
  }

  return transactions.filter((transaction) => accountIds.includes(transaction._account || ""));
}

// Stable month key used by the rail active state.
function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLoadedTransactionDateRange(transactions: Transaction[]) {
  const timestamps = transactions
    .map((transaction) => parseInputDate(getTransactionDateValue(transaction)))
    .filter((date): date is Date => Boolean(date));

  if (timestamps.length === 0) {
    return null;
  }

  const firstDate = new Date(Math.min(...timestamps.map((date) => date.getTime())));
  const lastDate = new Date(Math.max(...timestamps.map((date) => date.getTime())));

  return {
    from: formatDateInputValue(firstDate),
    to: formatDateInputValue(lastDate)
  };
}

function getTransactionDateValue(transaction: Transaction) {
  return typeof transaction.date === "string" ? transaction.date.slice(0, 10) : "";
}

type MobileTransactionSearchViewProps = {
  activeFilterCount: number;
  categoryColors: Record<string, string>;
  categorySelectOptions: SelectOption[];
  dateRange: TransactionDateRange;
  emptyMessage: string;
  groupByDate: boolean;
  hasMoreTransactions: boolean;
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  isLoadingTransactions: boolean;
  onBack: () => void;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onDateRangeChange: (dateRange: TransactionDateRange) => void;
  onFilterOpen: () => void;
  onLoadAllTransactions: () => void;
  onLoadMoreTransactions: () => void;
  onOpenSettings: () => void;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSortOpen: () => void;
  query: string;
  transactions: Transaction[];
};

// Full-screen mobile search surface with controls above all loaded transactions.
function MobileTransactionSearchView({
  activeFilterCount,
  categoryColors,
  categorySelectOptions,
  dateRange,
  emptyMessage,
  groupByDate,
  hasMoreTransactions,
  isLoadingAllTransactions,
  isLoadingMoreTransactions,
  isLoadingTransactions,
  onBack,
  onCategoryChange,
  onDateRangeChange,
  onFilterOpen,
  onLoadAllTransactions,
  onLoadMoreTransactions,
  onOpenSettings,
  onSearchChange,
  onSortOpen,
  query,
  transactions
}: MobileTransactionSearchViewProps) {
  return (
    <>
      <MobilePageHeader
        actions={(
          <TransactionMobileMenu
            activeFilterCount={activeFilterCount}
            onFilterOpen={onFilterOpen}
            onOpenSettings={onOpenSettings}
            onSortOpen={onSortOpen}
          />
        )}
        leading={(
          <Button aria-label="Back to transactions" className="transaction-search-back" onClick={onBack} type="button" variant="ghost">
            <ArrowLeft aria-hidden="true" className="h-6 w-6" />
          </Button>
        )}
        title="Search"
      >
        <div className="transaction-mobile-search-controls">
          <label className="relative min-w-0">
            <span className="sr-only">Search transactions</span>
            <input
              autoFocus
              className="min-h-14 w-full rounded-[20px] border-0 bg-[var(--surface-2)] py-0 pr-[52px] pl-[18px] font-[inherit] text-base font-extrabold text-[var(--ink)] outline-none placeholder:text-[var(--muted-2)]"
              data-testid="transaction-search"
              onChange={onSearchChange}
              placeholder="Search..."
              value={query}
            />
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 right-[17px] h-5 w-5 -translate-y-1/2 text-[var(--accent-cream)]" />
          </label>
          <TransactionDateRangePicker dateRange={dateRange} mode="compact" onChange={onDateRangeChange} />
          <Button aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`} className="transaction-icon-action" data-testid="transaction-filter-button" onClick={onFilterOpen} title="Filters" type="button" variant="secondary">
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>
      </MobilePageHeader>
      <TransactionList
        categoryColors={categoryColors}
        categorySelectOptions={categorySelectOptions}
        editable
        emptyMessage={emptyMessage}
        groupByDate={groupByDate}
        hasMore={hasMoreTransactions}
        isLoading={isLoadingTransactions}
        isLoadingAll={isLoadingAllTransactions}
        isLoadingMore={isLoadingMoreTransactions}
        onCategoryChange={onCategoryChange}
        onLoadAll={onLoadAllTransactions}
        onLoadMore={onLoadMoreTransactions}
        transactions={transactions}
      />
    </>
  );
}

function TransactionMobileMenu({
  activeFilterCount,
  onFilterOpen,
  onOpenSettings,
  onSortOpen
}: {
  activeFilterCount: number;
  onFilterOpen: () => void;
  onOpenSettings: () => void;
  onSortOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const runMenuAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button aria-label="Transaction actions" className="transaction-icon-action" type="button" variant="secondary">
          <MoreVertical aria-hidden="true" className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="transaction-mobile-menu">
        <button onClick={() => runMenuAction(onFilterOpen)} type="button">
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
          <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
        </button>
        <button onClick={() => runMenuAction(onSortOpen)} type="button">
          <ArrowDownUp aria-hidden="true" className="h-5 w-5" />
          <span>Sort</span>
        </button>
        <button onClick={() => runMenuAction(onOpenSettings)} type="button">
          <Settings aria-hidden="true" className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

type TransactionFilterDialogProps = {
  accountOptions: TransactionAccountOption[];
  categoryOptions: string[];
  onAccountToggle: (account: string) => void;
  onCategoryToggle: (category: string) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onStatusChange: (filter: TransactionFilter) => void;
  open: boolean;
  transactionAccounts: string[];
  transactionCategory: string[];
  transactionFilter: TransactionFilter;
};

// Shows mobile filters in a bottom drawer
function TransactionFilterDialog({
  accountOptions,
  categoryOptions,
  onAccountToggle,
  onCategoryToggle,
  onOpenChange,
  onReset,
  onStatusChange,
  open,
  transactionAccounts,
  transactionCategory,
  transactionFilter
}: TransactionFilterDialogProps) {
  const filterBody = (
    <div className="mobile-filter-drawer-body">
      <div className="mobile-filter-section">
        <h3>Status</h3>
        <div className="mobile-filter-chips">
          {transactionFilters.map((filter) => (
            <button
              className={filter === transactionFilter ? "active" : undefined}
              key={filter}
              onClick={() => onStatusChange(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      <div className="mobile-filter-section">
        <h3>Account</h3>
        <FilterMultiSelect
          allLabel="All accounts"
          allValue={allAccountsValue}
          contentTestId="transaction-account-filter-options"
          onToggle={onAccountToggle}
          options={getAccountFilterOptions(accountOptions)}
          selectedValues={transactionAccounts}
          triggerTestId="transaction-account-filter-trigger"
        />
      </div>
      <div className="mobile-filter-section">
        <h3>Category</h3>
        <FilterMultiSelect
          allLabel="All categories"
          allValue="All categories"
          contentTestId="transaction-category-filter-options"
          onToggle={onCategoryToggle}
          options={getCategoryFilterOptions(categoryOptions)}
          selectedValues={transactionCategory}
          triggerTestId="transaction-category-filter-trigger"
        />
      </div>
    </div>
  );

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="mobile-filter-drawer">
        <DrawerHeader className="mobile-filter-header">
          <button className="mobile-filter-reset" onClick={onReset} type="button">
            Reset
          </button>
          <DrawerTitle>Filters</DrawerTitle>
          <DrawerDescription className="sr-only">Filter transactions by status and one or more categories.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        {filterBody}
      </DrawerContent>
    </Drawer>
  );
}

type TransactionSortDialogProps = {
  onApply: () => void;
  onOpenChange: (open: boolean) => void;
  onSortChange: (sort: TransactionSort) => void;
  open: boolean;
  transactionSort: TransactionSort;
};

// Shows mobile sorting in a bottom drawer and applies the choice immediately
function TransactionSortDialog({
  onApply,
  onOpenChange,
  onSortChange,
  open,
  transactionSort
}: TransactionSortDialogProps) {
  const handleSortChange = (sort: TransactionSort) => {
    onSortChange(sort);
    onApply();
  };
  const sortBody = (
    <div className="mobile-filter-drawer-body">
      <div className="mobile-sort-options">
        {transactionSortOptions.map((sort) => (
          <button key={sort} onClick={() => handleSortChange(sort)} type="button">
            <span>{sort}</span>
            <span aria-hidden="true" className={sort === transactionSort ? "radio active" : "radio"} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="mobile-filter-drawer mobile-sort-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>Sort</DrawerTitle>
          <DrawerDescription className="sr-only">Choose the order for the transactions list.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        {sortBody}
      </DrawerContent>
    </Drawer>
  );
}

function getStringOptions<T extends string>(values: T[]) {
  return values.map((value) => ({
    label: value,
    value
  }));
}

const allAccountsValue = "__all_accounts__";

function FilterMultiSelect({
  allLabel,
  allValue,
  contentTestId,
  onToggle,
  options,
  selectedValues,
  triggerTestId
}: {
  allLabel: string;
  allValue: string;
  contentTestId?: string;
  onToggle: (value: string) => void;
  options: TransactionAccountOption[];
  selectedValues: string[];
  triggerTestId?: string;
}) {
  const label = getFilterMultiSelectLabel(selectedValues, options, allLabel);

  return (
    <MultiSelectDropdown
      ariaLabel={allLabel}
      contentTestId={contentTestId}
      getOptionIsActive={(option) => getFilterOptionIsActive(option.value, allValue, selectedValues)}
      label={label}
      onToggle={onToggle}
      options={getMultiSelectOptions(options)}
      selectedValues={selectedValues}
      triggerTestId={triggerTestId}
    />
  );
}

function getFilterOptionIsActive(value: string, allValue: string, selectedValues: string[]) {
  return value === allValue ? selectedValues.length === 0 : selectedValues.includes(value);
}

function getFilterMultiSelectLabel(selectedValues: string[], options: TransactionAccountOption[], allLabel: string) {
  if (selectedValues.length === 0) {
    return allLabel;
  }

  if (selectedValues.length === 1) {
    return options.find((option) => option.value === selectedValues[0])?.label || selectedValues[0];
  }

  return `${selectedValues.length} selected`;
}

function getMultiSelectOptions(options: TransactionAccountOption[]): MultiSelectDropdownOption[] {
  return options.map((option) => ({
    label: option.label,
    value: option.value
  }));
}

function getCategoryFilterOptions(categoryOptions: string[]): TransactionAccountOption[] {
  return categoryOptions.map((category) => ({ label: category, value: category }));
}

function getAccountFilterOptions(accountOptions: TransactionAccountOption[]) {
  return [{ label: "All accounts", value: allAccountsValue }, ...accountOptions];
}
