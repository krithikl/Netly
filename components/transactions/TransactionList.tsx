import { InfoRow } from "@/components/ui/InfoRow";
import { categoryColors } from "@/lib/mock-data";
import { formatMoney } from "@/lib/insights";
import type { Transaction } from "@/lib/types";

type TransactionListProps = {
  categoryOptions?: string[];
  editable?: boolean;
  emptyMessage?: string;
  onCategoryChange?: (transactionId: string, category: string) => void;
  transactions: Transaction[];
};

export function TransactionList({
  categoryOptions = [],
  editable = false,
  emptyMessage = "No transactions to show.",
  onCategoryChange,
  transactions
}: TransactionListProps) {
  if (transactions.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="stack-list">
      {transactions.map((transaction) => {
        const row = getTransactionRow(transaction);

        return (
          <InfoRow
            action={getCategoryAction(transaction, editable, categoryOptions, onCategoryChange)}
            color={row.color}
            key={transaction.id}
            meta={row.meta}
            title={row.title}
            value={row.value}
            valueTone={row.valueTone}
            warning={row.warning}
          />
        );
      })}
    </div>
  );
}

function getTransactionRow(transaction: Transaction) {
  return {
    color: getTransactionColor(transaction),
    meta: getTransactionMeta(transaction),
    title: transaction.merchant,
    value: formatMoney(transaction.amount, true),
    valueTone: transaction.amount < 0 ? "negative" : "positive",
    warning: transaction.needsReview ? transaction.rawDescription : undefined
  };
}

function getTransactionColor(transaction: Transaction) {
  return categoryColors[transaction.category] || "#607d8b";
}

function getTransactionMeta(transaction: Transaction) {
  const confidence = Math.round(transaction.confidence * 100);
  return `${transaction.date} · ${transaction.category} · ${transaction.account} · ${transaction.status} · ${confidence}% confidence`;
}

function getCategoryAction(
  transaction: Transaction,
  editable: boolean,
  categoryOptions: string[],
  onCategoryChange?: (transactionId: string, category: string) => void
) {
  if (!editable) {
    return undefined;
  }

  const categoryLabel = `Set category for ${transaction.merchant}`;

  return (
    <select
      aria-label={categoryLabel}
      className="row-category-select"
      onChange={(event) => onCategoryChange?.(transaction.id, event.target.value)}
      value={transaction.category}
    >
      {categoryOptions.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
