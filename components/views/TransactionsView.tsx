import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowDownUp, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { TransactionList } from "@/components/transactions/TransactionList";
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
import { SelectField } from "@/components/ui/select-field";
import type { Transaction } from "@/lib/types";
import type { TransactionFilter, TransactionSort } from "@/lib/app/types";

type TransactionsViewProps = {
  categoryColors: Record<string, string>;
  categoryOptions: string[];
  isLoadingTransactions: boolean;
  onCategoryChange: (transactionId: string, category: string) => void;
  onCreateCategory: (category: string) => void;
  query: string;
  setQuery: (query: string) => void;
  setTransactionCategory: (categories: string[]) => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setTransactionSort: (sort: TransactionSort) => void;
  transactionCategory: string[];
  transactionFilter: TransactionFilter;
  transactionSort: TransactionSort;
  transactions: Transaction[];
};

const transactionFilters: TransactionFilter[] = ["All", "Expenses", "Income", "Upcoming"];
const transactionSortOptions: TransactionSort[] = ["Newest", "Oldest", "Amount high", "Amount low"];

// Handles transaction search, filters, sorting, and category creation
export function TransactionsView({
  categoryColors,
  categoryOptions,
  isLoadingTransactions,
  onCategoryChange,
  onCreateCategory,
  query,
  setQuery,
  setTransactionCategory,
  setTransactionFilter,
  setTransactionSort,
  transactionCategory,
  transactionFilter,
  transactionSort,
  transactions
}: TransactionsViewProps) {
  const [newCategory, setNewCategory] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const categorySelectOptions = useMemo(() => getStringOptions(categoryOptions), [categoryOptions]);
  const editableCategorySelectOptions = useMemo(() => getStringOptions(editableCategoryOptions), [editableCategoryOptions]);
  const filterSelectOptions = useMemo(() => getStringOptions(transactionFilters), []);
  const sortSelectOptions = useMemo(() => getStringOptions(transactionSortOptions), []);
  const canCreateCategory = normalizedNewCategory.length > 0 && !duplicateCategory;
  const shownTransactions = isLoadingTransactions ? [] : transactions;
  const activeFilterCount = getActiveFilterCount(transactionFilter, transactionCategory);
  const desktopCategoryValue = getDesktopCategoryValue(transactionCategory);
  const resetFilters = () => {
    setTransactionFilter("All");
    setTransactionCategory([]);
  };
  const handleDesktopCategoryChange = (category: string) => setTransactionCategory(category === "All categories" ? [] : [category]);

  // Let mobile users choose multiple categories, or clear them with All categories
  const toggleTransactionCategory = (category: string) => {
    if (category === "All categories") {
      setTransactionCategory([]);
      return;
    }

    setTransactionCategory(toggleCategorySelection(transactionCategory, category));
  };
  const closeSort = () => setSortOpen(false);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Transactions" subtitle="Akahu merchant and category enrichment where available" />
        <div className="transaction-mobile-controls">
          <label className="transaction-mobile-search">
            Search
            <input
              className="search"
              onChange={handleSearchChange}
              placeholder="Search transactions"
              value={query}
            />
          </label>
          <div className="transaction-mobile-actions">
            <Button onClick={() => setFiltersOpen(true)} type="button" variant="secondary">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button onClick={() => setSortOpen(true)} type="button" variant="secondary">
              <ArrowDownUp aria-hidden="true" className="h-4 w-4" />
              Sort
            </Button>
          </div>
        </div>
        <div className="transaction-controls transaction-desktop-controls">
          <label>
            Search
            <input
              className="search"
              onChange={handleSearchChange}
              placeholder="Search merchant, bank text, category"
              value={query}
            />
          </label>
          <label>
            Status
            <SelectField onChange={setTransactionFilter} options={filterSelectOptions} value={transactionFilter} />
          </label>
          <label>
            Category
            <SelectField onChange={handleDesktopCategoryChange} options={categorySelectOptions} value={desktopCategoryValue} />
          </label>
          <label>
            Sort
            <SelectField onChange={setTransactionSort} options={sortSelectOptions} value={transactionSort} />
          </label>
        </div>
        <TransactionFilterDialog
          categoryOptions={categoryOptions}
          onCategoryToggle={toggleTransactionCategory}
          onOpenChange={setFiltersOpen}
          onReset={resetFilters}
          onStatusChange={setTransactionFilter}
          open={filtersOpen}
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
        <div className="category-create-row">
          <label>
            New category
            <input onChange={handleNewCategoryChange} placeholder="e.g. Kids, Pets, Travel" value={newCategory} />
          </label>
          <Button disabled={!canCreateCategory} onClick={handleCreateCategory} type="button" variant="secondary">
            Add category
          </Button>
          {categoryErrorMessage && (
            <p aria-live="polite" className="category-error-message">
              {categoryErrorMessage}
            </p>
          )}
        </div>
        <TransactionList
          categoryColors={categoryColors}
          editable
          categorySelectOptions={editableCategorySelectOptions}
          emptyMessage="No transactions match the current filters."
          onCategoryChange={onCategoryChange}
          transactions={shownTransactions}
        />
      </section>
    </section>
  );
}

type TransactionFilterDialogProps = {
  categoryOptions: string[];
  onCategoryToggle: (category: string) => void;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
  onStatusChange: (filter: TransactionFilter) => void;
  open: boolean;
  transactionCategory: string[];
  transactionFilter: TransactionFilter;
};

// Shows mobile filters in a bottom drawer
function TransactionFilterDialog({
  categoryOptions,
  onCategoryToggle,
  onOpenChange,
  onReset,
  onStatusChange,
  open,
  transactionCategory,
  transactionFilter
}: TransactionFilterDialogProps) {
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
            <h3>Category</h3>
            <div className="mobile-filter-chips category">
              {categoryOptions.map((category) => (
                <button
                  className={getFilterCategoryIsActive(category, transactionCategory) ? "active" : undefined}
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

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <DrawerContent className="mobile-filter-drawer mobile-sort-drawer">
        <DrawerHeader className="mobile-filter-header centered">
          <DrawerTitle>Sort</DrawerTitle>
          <DrawerDescription className="sr-only">Choose the order for the transactions list.</DrawerDescription>
          <DrawerHeaderClose className="mobile-filter-close" />
        </DrawerHeader>
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

function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

function getMatchingCategory(categories: string[], category: string) {
  if (!category) {
    return "";
  }

  return categories.find((currentCategory) => currentCategory.toLowerCase() === category.toLowerCase()) || "";
}

// Counts hidden mobile filters so the Filters button can show a badge
function getActiveFilterCount(transactionFilter: TransactionFilter, transactionCategory: string[]) {
  let count = 0;

  if (transactionFilter !== "All") {
    count += 1;
  }

  count += transactionCategory.length;

  return count;
}

function getDesktopCategoryValue(transactionCategory: string[]) {
  return transactionCategory.length === 1 ? transactionCategory[0] : "All categories";
}

function getFilterCategoryIsActive(category: string, transactionCategory: string[]) {
  return category === "All categories" ? transactionCategory.length === 0 : transactionCategory.includes(category);
}

function toggleCategorySelection(selectedCategories: string[], category: string) {
  if (selectedCategories.includes(category)) {
    return selectedCategories.filter((selectedCategory) => selectedCategory !== category);
  }

  return [...selectedCategories, category];
}
