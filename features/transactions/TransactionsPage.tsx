import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownUp, CalendarDays, Check, ChevronDown, Plus, ReceiptText, Search, Shapes, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { TransactionList } from "@/features/transactions/TransactionList";
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
import { formatDateInputValue, getThisMonthDateRange } from "@/lib/periods";
import { getTransactionCategory, transactionNeedsReview } from "@/lib/transaction-display";
import { categoriesMatch, type CategoryEditScope } from "@/lib/category-rules";
import type { Transaction, TransactionDateRange } from "@/lib/types";
import type { TransactionAccountOption, TransactionFilter, TransactionSort } from "@/lib/app/types";

type TransactionsPageProps = {
  accountOptions: TransactionAccountOption[];
  categoryColors: Record<string, string>;
  categoryOptions: string[];
  dateRange: TransactionDateRange;
  hasMoreTransactions: boolean;
  isLoadingAllTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  isLoadingTransactions: boolean;
  onCategoryChange: (transaction: Transaction, category: string, scope: CategoryEditScope) => void;
  onCreateCategory: (category: string) => void;
  onDateRangeChange: (dateRange: TransactionDateRange) => void;
  onLoadAllTransactions: () => void;
  onLoadMoreTransactions: () => void;
  query: string;
  setQuery: (query: string) => void;
  setTransactionAccounts: (accounts: string[]) => void;
  setTransactionCategory: (categories: string[]) => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setTransactionSort: (sort: TransactionSort) => void;
  transactionAccounts: string[];
  transactionCategory: string[];
  transactionFilter: TransactionFilter;
  transactionSort: TransactionSort;
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
  dateRange,
  hasMoreTransactions,
  isLoadingAllTransactions,
  isLoadingMoreTransactions,
  isLoadingTransactions,
  onCategoryChange,
  onCreateCategory,
  onDateRangeChange,
  onLoadAllTransactions,
  onLoadMoreTransactions,
  query,
  setQuery,
  setTransactionAccounts,
  setTransactionCategory,
  setTransactionFilter,
  setTransactionSort,
  transactionAccounts,
  transactionCategory,
  transactionFilter,
  transactionSort,
  transactions
}: TransactionsPageProps) {
  const [newCategory, setNewCategory] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const normalizedNewCategory = normalizeCategoryName(newCategory);
  const duplicateCategory = getMatchingCategory(categoryOptions, normalizedNewCategory);
  const categoryErrorMessage = duplicateCategory ? `${duplicateCategory} already exists` : "";
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value);
  const handleNewCategoryChange = (event: ChangeEvent<HTMLInputElement>) => setNewCategory(event.target.value);
  const handleCreateCategory = () => {
    if (!normalizedNewCategory || duplicateCategory) {
      return;
    }

    onCreateCategory(normalizedNewCategory);
    toast.success("Category added");
    setNewCategory("");
  };
  const editableCategoryOptions = useMemo(() => categoryOptions.filter((category) => category !== "All categories"), [categoryOptions]);
  const editableCategorySelectOptions = useMemo(() => getStringOptions(editableCategoryOptions), [editableCategoryOptions]);
  const filterSelectOptions = useMemo(() => getStringOptions(transactionFilters), []);
  const sortSelectOptions = useMemo(() => getStringOptions(transactionSortOptions), []);
  const canCreateCategory = normalizedNewCategory.length > 0 && !duplicateCategory;
  const shownTransactions = transactions;
  const shouldShowListLoading = isLoadingTransactions && transactions.length === 0;
  const analytics = useMemo(() => getTransactionAnalytics(shownTransactions, dateRange), [shownTransactions, dateRange]);
  const activeFilterCount = getActiveFilterCount(transactionFilter, transactionAccounts, transactionCategory);
  const isBottomNavigation = useIsBottomNavigation();
  const resetFilters = () => {
    setTransactionFilter("All");
    setTransactionAccounts([]);
    setTransactionCategory([]);
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

  return (
    <section className="transaction-page view-stack">
      <TransactionAnalyticsSummary analytics={analytics} onReviewNeedsReview={reviewNeedsReview} />

      <section className="transaction-workspace">
        <div className="transaction-filter-panel" suppressHydrationWarning>
          <div className="transaction-mobile-controls">
            <div className="transaction-mobile-search-row">
              <label className="transaction-mobile-search">
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
              <TransactionDateRangePicker dateRange={dateRange} mode="compact" onChange={onDateRangeChange} />
            </div>
            {isBottomNavigation && (
              <div className="transaction-mobile-actions">
                <Button onClick={() => setFiltersOpen(true)} type="button" variant="secondary">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Button>
                <Button onClick={() => setSortOpen(true)} type="button" variant="secondary">
                  <ArrowDownUp aria-hidden="true" className="h-4 w-4" />
                  Sort
                </Button>
                <Button aria-label="Categories" onClick={() => setCategoryOpen(true)} title="Categories" type="button" variant="secondary">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
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
            <TransactionDateRangePicker dateRange={dateRange} onChange={onDateRangeChange} />
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
          <div className="transaction-archive-note">
            <span>Transactions are encrypted locally when first seen. Google Drive backup can be connected from Settings.</span>
          </div>
          <div className="transaction-filter-actions">
            <div className="category-create-row">
              <label>
                New category
                <input onChange={handleNewCategoryChange} placeholder="e.g. Kids, Pets, Coffee" value={newCategory} />
              </label>
              <Button className="transaction-add-category-button" disabled={!canCreateCategory} onClick={handleCreateCategory} type="button" variant="outline">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add new category
              </Button>
              {categoryErrorMessage && (
                <p aria-live="polite" className="category-error-message">
                  {categoryErrorMessage}
                </p>
              )}
            </div>
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
        <TransactionCategoryDialog
          canCreateCategory={canCreateCategory}
          categoryErrorMessage={categoryErrorMessage}
          newCategory={newCategory}
          onCreateCategory={handleCreateCategory}
          onNewCategoryChange={handleNewCategoryChange}
          onOpenChange={setCategoryOpen}
          open={categoryOpen}
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
          onLoadAll={onLoadAllTransactions}
          onLoadMore={onLoadMoreTransactions}
          transactions={shownTransactions}
        />
      </section>
    </section>
  );
}

type TransactionAnalytics = {
  activeCategoryCount: number;
  averagePerDay: number;
  needsReviewCount: number;
  totalSpending: number;
};

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

// Derives transaction totals for the current Transactions page filter/date range.
function getTransactionAnalytics(transactions: Transaction[], dateRange: TransactionDateRange): TransactionAnalytics {
  const activeCategories = new Set<string>();
  let needsReviewCount = 0;
  let totalSpending = 0;

  transactions.forEach((transaction) => {
    if (transactionNeedsReview(transaction)) {
      needsReviewCount += 1;
    }

    if (transaction.amount < 0) {
      totalSpending += Math.abs(transaction.amount);
      activeCategories.add(getTransactionCategory(transaction));
    }
  });

  const rangeDays = getDateRangeDayCount(dateRange);

  return {
    activeCategoryCount: activeCategories.size,
    averagePerDay: rangeDays > 0 ? totalSpending / rangeDays : 0,
    needsReviewCount,
    totalSpending
  };
}

function getDateRangeDayCount(dateRange: TransactionDateRange) {
  const from = parseInputDate(dateRange.from);
  const to = parseInputDate(dateRange.to);

  if (!from || !to) {
    return 0;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
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

type TransactionCategoryDialogProps = {
  canCreateCategory: boolean;
  categoryErrorMessage: string;
  newCategory: string;
  onCreateCategory: () => void;
  onNewCategoryChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function TransactionCategoryDialog({
  canCreateCategory,
  categoryErrorMessage,
  newCategory,
  onCreateCategory,
  onNewCategoryChange,
  onOpenChange,
  open
}: TransactionCategoryDialogProps) {
  const handleCreateCategory = () => {
    if (!canCreateCategory) {
      return;
    }

    onCreateCategory();
  };

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="mobile-filter-drawer mobile-category-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>New category</DrawerTitle>
          <DrawerDescription className="sr-only">Create a transaction category.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
        <div className="mobile-filter-drawer-body">
          <div className="mobile-filter-section">
            <div className="mobile-category-create-row">
              <input onChange={onNewCategoryChange} placeholder="e.g. Kids, Pets, Coffee" value={newCategory} />
              <Button disabled={!canCreateCategory} onClick={handleCreateCategory} type="button" variant="outline">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add
              </Button>
            </div>
            {categoryErrorMessage && (
              <p aria-live="polite" className="category-error-message">
                {categoryErrorMessage}
              </p>
            )}
          </div>
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

function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function getMatchingCategory(categories: string[], category: string) {
  if (!category) {
    return "";
  }

  return categories.find((currentCategory) => categoriesMatch(currentCategory, category)) || "";
}

// Counts hidden mobile filters so the Filters button can show a badge
function getActiveFilterCount(transactionFilter: TransactionFilter, transactionAccounts: string[], transactionCategory: string[]) {
  let count = 0;

  if (transactionFilter !== "All") {
    count += 1;
  }

  count += transactionAccounts.length;
  count += transactionCategory.length;

  return count;
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

function toggleFilterSelection(selectedValues: string[], value: string) {
  if (selectedValues.includes(value)) {
    return selectedValues.filter((selectedValue) => selectedValue !== value);
  }

  return [...selectedValues, value];
}

function getCategoryFilterOptions(categoryOptions: string[]): TransactionAccountOption[] {
  return categoryOptions.map((category) => ({ label: category, value: category }));
}

function getAccountFilterOptions(accountOptions: TransactionAccountOption[]) {
  return [{ label: "All accounts", value: allAccountsValue }, ...accountOptions];
}
