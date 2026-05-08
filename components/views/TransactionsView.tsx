import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { TransactionList } from "@/components/transactions/TransactionList";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { PanelTitle } from "@/components/ui/PanelTitle";
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
  setTransactionCategory: (category: string) => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setTransactionSort: (sort: TransactionSort) => void;
  transactionCategory: string;
  transactionFilter: TransactionFilter;
  transactionSort: TransactionSort;
  transactions: Transaction[];
};

const transactionFilters: TransactionFilter[] = ["All", "Expenses", "Income", "Upcoming"];
const transactionSortOptions: TransactionSort[] = ["Newest", "Oldest", "Amount high", "Amount low"];

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
  const [categorySuccessMessage, setCategorySuccessMessage] = useState("");
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
    setCategorySuccessMessage(`Added ${normalizedNewCategory}`);
    setNewCategory("");
  };
  const editableCategoryOptions = categoryOptions.filter((category) => category !== "All categories");
  const categorySelectOptions = getStringOptions(categoryOptions);
  const editableCategorySelectOptions = getStringOptions(editableCategoryOptions);
  const filterSelectOptions = getStringOptions(transactionFilters);
  const sortSelectOptions = getStringOptions(transactionSortOptions);
  const canCreateCategory = normalizedNewCategory.length > 0 && !duplicateCategory;
  const shownTransactions = isLoadingTransactions ? [] : transactions;

  useEffect(() => {
    if (!categorySuccessMessage) {
      return undefined;
    }

    const clearMessage = window.setTimeout(() => setCategorySuccessMessage(""), 2400);
    return () => window.clearTimeout(clearMessage);
  }, [categorySuccessMessage]);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Transactions" subtitle="Akahu merchant and category enrichment where available" />
        <div className="transaction-controls">
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
            <CustomSelect onChange={setTransactionFilter} options={filterSelectOptions} value={transactionFilter} />
          </label>
          <label>
            Category
            <CustomSelect onChange={setTransactionCategory} options={categorySelectOptions} value={transactionCategory} />
          </label>
          <label>
            Sort
            <CustomSelect onChange={setTransactionSort} options={sortSelectOptions} value={transactionSort} />
          </label>
        </div>
        <div className="category-create-row">
          <label>
            New category
            <input onChange={handleNewCategoryChange} placeholder="e.g. Kids, Pets, Travel" value={newCategory} />
          </label>
          <button className="tonal-action" disabled={!canCreateCategory} onClick={handleCreateCategory} type="button">
            Add category
          </button>
          {categoryErrorMessage && (
            <p aria-live="polite" className="category-error-message">
              {categoryErrorMessage}
            </p>
          )}
          {categorySuccessMessage && (
            <p aria-live="polite" className="category-success-message">
              {categorySuccessMessage}
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
