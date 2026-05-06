import { TransactionList } from "@/components/transactions/TransactionList";
import { PanelTitle } from "@/components/ui/PanelTitle";
import type { Transaction } from "@/lib/types";
import type { TransactionFilter, TransactionSort } from "@/lib/app/types";

type TransactionsViewProps = {
  categoryOptions: string[];
  isLoadingTransactions: boolean;
  onCategoryChange: (transactionId: string, category: string) => void;
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
  categoryOptions,
  isLoadingTransactions,
  onCategoryChange,
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
  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Transactions" subtitle="Bank descriptions are categorized with confidence scoring" />
        <div className="transaction-controls">
          <label>
            Search
            <input
              className="search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search merchant, bank text, category"
              value={query}
            />
          </label>
          <label>
            Status
            <select value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value as TransactionFilter)}>
              {transactionFilters.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={transactionCategory} onChange={(event) => setTransactionCategory(event.target.value)}>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort
            <select value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as TransactionSort)}>
              {transactionSortOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TransactionList
          editable
          categoryOptions={categoryOptions.filter((category) => category !== "All categories")}
          emptyMessage="No transactions match the current filters."
          onCategoryChange={onCategoryChange}
          transactions={isLoadingTransactions ? [] : transactions}
        />
      </section>
    </section>
  );
}
