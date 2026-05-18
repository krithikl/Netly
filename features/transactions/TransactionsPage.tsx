import type { ChangeEvent, TouchEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownUp, CalendarDays, Check, ChevronDown, ReceiptText, Search, Shapes, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
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
import { SelectField } from "@/components/ui/select-field";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
import { formatMoney } from "@/lib/insights";
import { filterTransactionsByDateRange, formatDateInputValue, getThisMonthDateRange } from "@/lib/periods";
import { type CategoryEditScope } from "@/lib/category-rules";
import { getTransactionCategory } from "@/lib/transaction-display";
import type { Transaction, TransactionDateRange } from "@/lib/types";
import type { TransactionAccountOption, TransactionFilter, TransactionSort } from "@/lib/app/types";
import {
  getActiveFilterCount,
  getTransactionAnalytics,
  getVisibleTransactions,
  toggleFilterSelection,
  type TransactionAnalytics
} from "@/features/transactions/transactionLogic";

export type TransactionOpenPreset = {
  dateRange?: TransactionDateRange;
  id: number;
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
  incomeExcludedCategories: string[];
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  isLoadingTransactions: boolean;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onDateRangeChange: (dateRange: TransactionDateRange) => void;
  onMonthRangeChange: (dateRange: TransactionDateRange) => void;
  onLoadAllTransactions: (dateRange: TransactionDateRange) => void;
  onLoadMoreTransactions: (dateRange: TransactionDateRange) => void;
  openPreset: TransactionOpenPreset | null;
  transactions: Transaction[];
};

const transactionFilters: TransactionFilter[] = ["All", "Expenses", "Income"];
const transactionSortOptions: TransactionSort[] = ["Newest", "Oldest", "Amount high", "Amount low"];

// Handles transaction search, filters, sorting, and category creation
// Full transactions screen: search, filters, date range, category editing, and pagination.
export function TransactionsPage({
  accountOptions,
  categoryColors,
  categoryOptions,
  defaultAccountId,
  hasMoreTransactions,
  initialDateRange,
  incomeExcludedCategories,
  isLoadingAllTransactions,
  isLoadingMoreTransactions,
  isLoadingTransactions,
  onCategoryChange,
  onDateRangeChange,
  onMonthRangeChange,
  onLoadAllTransactions,
  onLoadMoreTransactions,
  openPreset,
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
  const [sortOpen, setSortOpen] = useState(false);
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value);
  const editableCategoryOptions = useMemo(() => categoryOptions.filter((category) => category !== "All categories"), [categoryOptions]);
  const editableCategorySelectOptions = useMemo(() => getStringOptions(editableCategoryOptions), [editableCategoryOptions]);
  const filterSelectOptions = useMemo(() => getStringOptions(transactionFilters), []);
  const sortSelectOptions = useMemo(() => getStringOptions(transactionSortOptions), []);
  const dateRangeTransactions = useMemo(() => filterTransactionsByDateRange(transactions, dateRange), [dateRange, transactions]);
  const monthOptions = useMemo(() => getTransactionMonthOptions(dateRange), [dateRange]);
  const monthSummaryTransactions = useMemo(() => filterTransactionsByAccount(dateRangeTransactions, transactionAccounts), [dateRangeTransactions, transactionAccounts]);
  const monthSummary = useMemo(() => getTransactionMonthSummary(monthSummaryTransactions, incomeExcludedCategories), [incomeExcludedCategories, monthSummaryTransactions]);
  const shownTransactions = useMemo(
    () => getVisibleTransactions(dateRangeTransactions, query, transactionAccounts, transactionCategory, transactionFilter, transactionSort),
    [dateRangeTransactions, query, transactionAccounts, transactionCategory, transactionFilter, transactionSort]
  );
  const shouldShowListLoading = isLoadingTransactions && transactions.length === 0;
  const analytics = useMemo(() => getTransactionAnalytics(shownTransactions, dateRange), [shownTransactions, dateRange]);
  const activeFilterCount = getActiveFilterCount(transactionFilter, transactionAccounts, transactionCategory);
  const isBottomNavigation = useIsBottomNavigation();
  const [monthCarouselDirection, setMonthCarouselDirection] = useState<"next" | "previous">("next");
  const [monthCarouselPhase, setMonthCarouselPhase] = useState<"a" | "b">("a");
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

    const currentMonth = parseInputDate(dateRange.from) || new Date();
    const nextMonth = parseInputDate(nextDateRange.from) || currentMonth;

    setMonthCarouselDirection(nextMonth.getTime() >= currentMonth.getTime() ? "next" : "previous");
    setMonthCarouselPhase((phase) => phase === "a" ? "b" : "a");
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
  const selectPreviousMonth = () => changeMonthRange(getMonthDateRange(addMonths(parseInputDate(dateRange.from) || new Date(), -1)));
  const selectNextMonth = () => changeMonthRange(getMonthDateRange(addMonths(parseInputDate(dateRange.from) || new Date(), 1)));
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
  }, [defaultAccountId, openPreset, onDateRangeChange]);

  useEffect(() => {
    setTransactionAccounts(getDefaultAccountFilter(defaultAccountId));
  }, [defaultAccountId]);

  return (
    <section
      className={`transaction-page view-stack month-carousel-${monthCarouselDirection} month-carousel-phase-${monthCarouselPhase}`}
      data-testid="transactions-page"
      onTouchCancel={() => setPageSwipeStart(null)}
      onTouchEnd={finishPageSwipe}
      onTouchStart={startPageSwipe}
    >
      <MobilePageHeader title="Transactions" />
      <TransactionMonthOverview
        activeDateRange={dateRange}
        monthOptions={monthOptions}
        monthSummary={monthSummary}
        onMonthSelect={selectMonth}
      />

      <section className="transaction-workspace">
        <div className="transaction-filter-panel" suppressHydrationWarning>
          <div className="transaction-mobile-controls">
            <div className={`transaction-mobile-action-row ${analytics.needsReviewCount > 0 ? "has-review" : "no-review"}`} suppressHydrationWarning>
              {isBottomNavigation && analytics.needsReviewCount > 0 && (
                <button className="transaction-review-shortcut" onClick={reviewNeedsReview} type="button">
                  {analytics.needsReviewCount} need review
                </button>
              )}
              <Button aria-label="Search transactions" className="transaction-icon-action" onClick={() => setSearchOpen(true)} title="Search" type="button" variant="secondary">
                <Search aria-hidden="true" className="h-5 w-5" />
              </Button>
              <TransactionDateRangePicker dateRange={dateRange} mode="compact" onChange={changeDateRange} />
              {isBottomNavigation && (
                <>
                  <Button aria-label={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`} className="transaction-icon-action" data-testid="transaction-filter-button" onClick={() => setFiltersOpen(true)} title="Filters" type="button" variant="secondary">
                    <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
                  </Button>
                  <Button aria-label="Sort transactions" className="transaction-icon-action" data-testid="transaction-sort-button" onClick={() => setSortOpen(true)} title="Sort" type="button" variant="secondary">
                    <ArrowDownUp aria-hidden="true" className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
            {query && (
              <button className="transaction-active-query" onClick={() => setSearchOpen(true)} type="button">
                Search: {query}
              </button>
            )}
          </div>
          <div className="transaction-controls transaction-desktop-controls">
            <label className="transaction-search-label">
              Search
              <span className="transaction-search-field">
                <Search aria-hidden="true" className="h-4 w-4" />
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
        <TransactionSearchDialog
          onOpenChange={setSearchOpen}
          onSearchChange={handleSearchChange}
          open={searchOpen}
          query={query}
        />
        <TransactionSortDialog
          onApply={closeSort}
          onOpenChange={setSortOpen}
          onSortChange={setTransactionSort}
          open={sortOpen}
          transactionSort={transactionSort}
        />
        <TransactionList
          categoryColors={categoryColors}
          editable
          categorySelectOptions={editableCategorySelectOptions}
          emptyMessage="No transactions match the current filters."
          onCategoryChange={onCategoryChange}
          hasMore={hasMoreTransactions}
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

type TransactionMonthOption = {
  date: Date;
  label: string;
  monthKey: string;
  shortLabel: string;
};

type TransactionMonthSummary = {
  expenses: number;
  income: number;
  net: number;
};

// Month-first navigation and totals for the active transaction period.
function TransactionMonthOverview({
  activeDateRange,
  monthOptions,
  monthSummary,
  onMonthSelect
}: {
  activeDateRange: TransactionDateRange;
  monthOptions: TransactionMonthOption[];
  monthSummary: TransactionMonthSummary;
  onMonthSelect: (monthDate: Date) => void;
}) {
  const activeDate = parseInputDate(activeDateRange.from) || new Date();
  const activeMonthKey = getMonthKey(activeDate);

  return (
    <section className="transaction-month-overview">
      <div className="transaction-month-carousel" aria-label="Transaction month carousel">
        <div className="transaction-month-rail" aria-label="Transaction month">
          {monthOptions.map((option) => (
            <button
              aria-current={option.monthKey === activeMonthKey ? "date" : undefined}
              className={option.monthKey === activeMonthKey ? "active" : undefined}
              key={option.monthKey}
              onClick={() => onMonthSelect(option.date)}
              type="button"
            >
              <span className="transaction-month-label-full">{option.label}</span>
              <span className="transaction-month-label-short">{option.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="transaction-month-summary" aria-label="Monthly transaction summary">
        <TransactionMonthMetric label="Money out" tone="expense" value={formatMoney(monthSummary.expenses, true)} />
        <TransactionMonthMetric label="Money in" tone="income" value={formatMoney(monthSummary.income, true)} />
        <TransactionMonthMetric label="Net movement" tone={monthSummary.net < 0 ? "expense" : "income"} value={formatMoney(monthSummary.net, true)} />
      </div>
    </section>
  );
}

// One desktop/mobile monthly cashflow metric.
function TransactionMonthMetric({ label, tone, value }: { label: string; tone: "expense" | "income"; value: string }) {
  return (
    <article className={`transaction-month-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
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
    <div className="transaction-analytics-grid">
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
    <article className="transaction-analytics-card">
      <span className={`transaction-analytics-icon transaction-analytics-icon-${tone}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {actionLabel && onAction ? (
          <button className="metric-action transaction-analytics-action" onClick={onAction} type="button">
            {actionLabel}
          </button>
        ) : (
          <small>{note}</small>
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

// Builds a five-month rail centered on the selected month.
function getTransactionMonthOptions(dateRange: TransactionDateRange): TransactionMonthOption[] {
  const activeDate = parseInputDate(dateRange.from) || new Date();
  const startDate = new Date(activeDate.getFullYear(), activeDate.getMonth() - 2, 1);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + index, 1);

    return {
      date,
      label: format(date, "MMMM"),
      monthKey: getMonthKey(date),
      shortLabel: format(date, "MMM")
    };
  });
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

// Totals money movement for the active month before search/filter narrowing.
function getTransactionMonthSummary(transactions: Transaction[], incomeExcludedCategories: string[]): TransactionMonthSummary {
  const excludedIncomeCategorySet = new Set(incomeExcludedCategories);

  return transactions.reduce<TransactionMonthSummary>((summary, transaction) => {
    if (transaction.amount < 0) {
      summary.expenses += Math.abs(transaction.amount);
    } else if (!excludedIncomeCategorySet.has(getTransactionCategory(transaction))) {
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

type TransactionSearchDialogProps = {
  onOpenChange: (open: boolean) => void;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  open: boolean;
  query: string;
};

// Shows search as a focused mobile drawer instead of a full-width always-on control.
function TransactionSearchDialog({
  onOpenChange,
  onSearchChange,
  open,
  query
}: TransactionSearchDialogProps) {
  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="mobile-filter-drawer transaction-search-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>Search</DrawerTitle>
          <DrawerDescription className="sr-only">Search transactions by merchant, bank text, or category.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        <div className="transaction-search-drawer-body">
          <label className="transaction-search-drawer-field">
            Search
            <span className="transaction-search-field">
              <Search aria-hidden="true" className="h-5 w-5" />
              <input
                className="search"
                data-testid="transaction-search"
                onChange={onSearchChange}
                placeholder="Search..."
                value={query}
              />
            </span>
          </label>
        </div>
      </DrawerContent>
    </Drawer>
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
        <div className="mobile-filter-chips category">
          {getAccountFilterOptions(accountOptions).map((account) => (
            <button
              className={getFilterOptionIsActive(account.value, allAccountsValue, transactionAccounts) ? "active" : undefined}
              key={account.value}
              onClick={() => onAccountToggle(account.value)}
              type="button"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mobile-filter-section">
        <h3>Category</h3>
        <div className="mobile-filter-chips category">
          {categoryOptions.map((category) => (
            <button
              className={getFilterOptionIsActive(category, "All categories", transactionCategory) ? "active" : undefined}
              key={category}
              onClick={() => onCategoryToggle(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
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
  onToggle,
  options,
  selectedValues
}: {
  allLabel: string;
  allValue: string;
  onToggle: (value: string) => void;
  options: TransactionAccountOption[];
  selectedValues: string[];
}) {
  const label = getFilterMultiSelectLabel(selectedValues, options, allLabel);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-haspopup="listbox" className="category-multi-select-trigger transaction-select-trigger" role="combobox" type="button">
          <span>{label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="category-multi-select-content">
        {options.map((option) => {
          const isActive = getFilterOptionIsActive(option.value, allValue, selectedValues);

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "active" : undefined}
              key={option.value}
              onClick={() => onToggle(option.value)}
              type="button"
            >
              <span className="category-multi-select-check">
                {isActive && <Check aria-hidden="true" className="h-4 w-4" />}
              </span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
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

function getCategoryFilterOptions(categoryOptions: string[]): TransactionAccountOption[] {
  return categoryOptions.map((category) => ({ label: category, value: category }));
}

function getAccountFilterOptions(accountOptions: TransactionAccountOption[]) {
  return [{ label: "All accounts", value: allAccountsValue }, ...accountOptions];
}
